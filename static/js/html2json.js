// Define universal classes
const UNIVERSAL_CLASSES = {
    kept: [
        "panel-body", "SubLevel4", "Block3", "Level2-Bold", "Level3Bold",
        "Block2", "Level2", "panel-default", "SubLevel1", "MsoNormalTable",
        "SubLevel3", "MsoTableGrid", "hisk", "Level4", "Bullet1", "Level5",
        "panel", "MsoToc2", "note", "Level3", "SubLevel2", "page-heading",
        "Level2Bold", "panel-group", "Level1", "col-md-10", "SubLevel1Bold",
        "collapse", "AMODTable", "Partheading", "Bullet2", "Block1",
        "SubLevel2Bold", "page-header", "TableNormal", "panel-collapse",
        "Subdocument", "external-link", "HistoryChar", "WordSection1",
        "MsoNormal", "TableGridLight1"
    ]
};

const HIERARCHY_LEVELS = {
    'Subdocument': 0,
    'SubLevel1': 1,
    'SubLevel1Bold': 1,
    'SubLevel2': 2,
    'SubLevel2Bold': 2,
    'MsoNormal': 3,
    'MsoNormalTable': 3,
    'SubLevel3Bold': 3,
    'TableGridLight1': 3,
    'SubLevel3': 3,
    'SubLevel4': 4,
    'Block1': 4,
    'Block2': 4,
    'Bullet1': 5,
    'Bullet2': 5
};

async function processAward(awardId) {
    try {
        console.log(`[DEBUG] Starting to process award: ${awardId}`);
        
        // Add cache-busting parameter to URL
        const timestamp = Date.now();
        const url = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://library.fairwork.gov.au/award/?krn=${awardId}&_=${timestamp}`)}`;
        console.log(`[DEBUG] Fetching from URL: ${url}`);
        
        const response = await fetch(url);
        const html = await response.text();
        console.log(`[DEBUG] Received HTML response of length: ${html.length}`);

        // Check for 404
        if (html.includes('<h1 class="page-title">Page not found (404)</h1>')) {
            console.log("[DEBUG] Page not found (404)");
            return null;
        }

        // Create a temporary DOM element to parse HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        console.log(`[DEBUG] Parsed HTML document`);

        const classEntries = [];
        const keptClasses = new Set(UNIVERSAL_CLASSES.kept);

        // Find and process elements with classes
        const elements = doc.querySelectorAll('*');
        console.log(`[DEBUG] Found ${elements.length} total elements`);
        
        elements.forEach((element, idx) => {
            // Skip elements without class attribute
            if (!element.hasAttribute('class')) return;
            
            const className = element.getAttribute('class');
            if (!className) return;

            const elementClasses = className.split(/\s+/);
            const keptElementClasses = elementClasses.filter(c => keptClasses.has(c));

            keptElementClasses.forEach(className => {
                const entry = {
                    id: classEntries.length,
                    class: className,
                    html: element.outerHTML
                };
                classEntries.push(entry);
            });
        });

        console.log(`[DEBUG] Processed ${classEntries.length} class entries`);
        console.log(`[DEBUG] First few entries:`, classEntries.slice(0, 3));

        // Build hierarchy
        const hierarchy = buildHierarchy(classEntries);
        console.log(`[DEBUG] Built hierarchy with ${hierarchy.length} top-level nodes`);
        
        return hierarchy;
    } catch (error) {
        console.error(`[DEBUG] Error in processAward:`, error);
        throw error; // Re-throw to be handled by caller
    }
}

function buildHierarchy(classEntries) {
    console.log(`[DEBUG] Starting hierarchy build with ${classEntries.length} entries`);
    
    // Filter for desired schedules content
    const desired_entries = [];
    let current_schedule = null;
    
    for (const entry of classEntries) {
        if (entry.class === 'Subdocument') {
            const html = entry.html.toLowerCase();
            if (html.includes('schedule a')) {
                current_schedule = 'a';
                desired_entries.push(entry);
                console.log(`[DEBUG] Found Schedule A`);
            } else if (html.includes('schedule b')) {
                current_schedule = 'b';
                desired_entries.push(entry);
                console.log(`[DEBUG] Found Schedule B`);
            } else if (html.includes('schedule c')) {
                current_schedule = 'c';
                desired_entries.push(entry);
                console.log(`[DEBUG] Found Schedule C`);
            } else if (html.includes('schedule d') || html.includes('schedule e') || 
                      html.includes('schedule f') || html.includes('schedule g')) {
                current_schedule = null;
            }
        } else if (current_schedule && HIERARCHY_LEVELS.hasOwnProperty(entry.class)) {
            desired_entries.push(entry);
        }
    }
    
    console.log(`[DEBUG] Filtered to ${desired_entries.length} desired entries`);
    
    // Build hierarchy from filtered entries
    const root = {id: 0, children: []};
    const stack = [root];
    
    for (const entry of desired_entries) {
        const level = HIERARCHY_LEVELS[entry.class];
        if (level === undefined) continue;
        
        const node = {
            id: entry.id,
            class: entry.class,
            html: entry.html,
            children: []
        };
        
        while (stack.length > 1 && 
               (HIERARCHY_LEVELS[stack[stack.length-1].class] || 0) >= level) {
            stack.pop();
        }
        stack[stack.length-1].children.push(node);
        stack.push(node);
    }
    
    console.log(`[DEBUG] Completed hierarchy build`);
    return root.children;
}

// Export for browser use
window.processAward = processAward;