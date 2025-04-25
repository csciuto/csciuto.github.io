// JavaScript code will go here
let timelineData = {}; // To store data from data.json
let allCategories = new Set(); // To store all unique categories
let currentSelectedYear = null; // To keep track of the currently displayed year
let isMouseOverTimeline = false; // Track mouse over timeline area
let isMouseOverTiles = false;    // Track mouse over tiles area

document.addEventListener('DOMContentLoaded', () => {
    console.log('Timeline page loaded.');
    setupHamburgerMenu(); // Setup menu toggle
    setupInteractionListeners(); // Setup hover listeners
    loadTimelineData();

    // ADD Mobile outside click listener
    document.addEventListener('click', handleOutsideClickMobile);
});

function setupHamburgerMenu() {
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const filterPanel = document.getElementById('filter-panel');

    if (hamburgerBtn && filterPanel) {
        hamburgerBtn.addEventListener('click', () => {
            const isExpanded = hamburgerBtn.getAttribute('aria-expanded') === 'true';
            hamburgerBtn.setAttribute('aria-expanded', !isExpanded);
            filterPanel.classList.toggle('filter-panel-hidden');
            filterPanel.classList.toggle('filter-panel-visible');
        });
        document.addEventListener('click', (event) => {
            if (!filterPanel.contains(event.target) && !hamburgerBtn.contains(event.target)) {
                if (filterPanel.classList.contains('filter-panel-visible')) {
                    hamburgerBtn.setAttribute('aria-expanded', 'false');
                    filterPanel.classList.remove('filter-panel-visible');
                    filterPanel.classList.add('filter-panel-hidden');
                }
            }
        });
    }
}

function setupInteractionListeners() {
    const timelineContainer = document.querySelector('.timeline-container');
    const tilesContainer = document.querySelector('.tiles-container');
    if (timelineContainer) {
        timelineContainer.addEventListener('mouseenter', handleMouseEnterTimeline);
        timelineContainer.addEventListener('mouseleave', handleMouseLeaveTimeline);
    }
    if (tilesContainer) {
        tilesContainer.addEventListener('mouseenter', handleMouseEnterTiles);
        tilesContainer.addEventListener('mouseleave', handleMouseLeaveTiles);
    }
}

async function loadTimelineData() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        timelineData = await response.json();
        console.log('Timeline data loaded:', timelineData);
        findAllCategories();
        buildTimeline();
        buildCategoryFilters();
    } catch (error) {
        console.error('Error loading timeline data:', error);
    }
}

function findAllCategories() {
    allCategories.clear();
    for (const year in timelineData) {
        timelineData[year].forEach(tile => {
            if (tile.category) {
                allCategories.add(tile.category);
            }
        });
    }
}

function buildCategoryFilters() {
    const filterContainer = document.getElementById('filter-container');
    if (!filterContainer) return;

    // --- Create Filter Controls --- 
    let controlsDiv = filterContainer.querySelector('.filter-controls');
    if (!controlsDiv) {
        controlsDiv = document.createElement('div');
        controlsDiv.className = 'filter-controls';
        controlsDiv.style.marginBottom = '10px'; // Add some space

        const selectAllBtn = document.createElement('button');
        selectAllBtn.textContent = 'All';
        selectAllBtn.id = 'filter-select-all';
        selectAllBtn.style.marginRight = '5px';
        selectAllBtn.addEventListener('click', selectAllCategories);

        const selectNoneBtn = document.createElement('button');
        selectNoneBtn.textContent = 'None';
        selectNoneBtn.id = 'filter-select-none';
        selectNoneBtn.addEventListener('click', selectNoneCategories);

        controlsDiv.appendChild(selectAllBtn);
        controlsDiv.appendChild(selectNoneBtn);

        // Add controls before the checkboxes container/heading
        filterContainer.prepend(controlsDiv); 
    }

    // --- Create Checkboxes --- 
    let checkboxesDiv = filterContainer.querySelector('.filter-checkboxes');
    if (!checkboxesDiv) {
         checkboxesDiv = document.createElement('div');
         checkboxesDiv.className = 'filter-checkboxes';
         filterContainer.appendChild(checkboxesDiv);
    }
    
    checkboxesDiv.innerHTML = '<h4>Filter by Category:</h4>'; // Clear existing checkboxes
    const categories = Array.from(allCategories).sort();

    categories.forEach(category => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = category;
        checkbox.checked = true;
        checkbox.id = `filter-${category}`;
        checkbox.addEventListener('change', updateDisplayedTiles); // Use wrapper function

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(category.charAt(0).toUpperCase() + category.slice(1)));
        checkboxesDiv.appendChild(label); // Append to the checkboxes div
    });
}

// ADDED: Function to handle selecting all categories
function selectAllCategories() {
    const checkboxes = document.querySelectorAll('#filter-container .filter-checkboxes input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = true);
    updateDisplayedTiles(); // Update display after changing filters
}

// ADDED: Function to handle selecting no categories
function selectNoneCategories() {
    const checkboxes = document.querySelectorAll('#filter-container .filter-checkboxes input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
    updateDisplayedTiles(); // Update display after changing filters
}

// ADDED: Wrapper function to update tiles based on current year and filters
function updateDisplayedTiles() {
    if (currentSelectedYear) {
        console.log("Filters changed, updating tiles for:", currentSelectedYear);
        displayTiles(currentSelectedYear);
    }
}

function buildTimeline() {
    const timelineUl = document.querySelector('.timeline');
    if (!timelineUl) return;
    const years = Object.keys(timelineData).sort((a, b) => parseInt(a) - parseInt(b));
    const currentYear = new Date().getFullYear();
    if (!years.includes(String(currentYear))) {
        years.push(String(currentYear));
        if (!timelineData[currentYear]) {
             timelineData[currentYear] = [];
        }
    }
    timelineUl.innerHTML = '';
    years.forEach(year => {
        const li = document.createElement('li');
        li.textContent = year;
        li.dataset.year = year;
        li.addEventListener('mouseover', handleYearHover);
        li.addEventListener('click', handleYearClickMobile);
        timelineUl.appendChild(li);
    });
}

// --- Hover Interaction Logic ---

function handleMouseEnterTimeline() {
    isMouseOverTimeline = true;
}

function handleMouseLeaveTimeline() {
    isMouseOverTimeline = false;
    checkAndHideTiles();
}

function handleMouseEnterTiles() {
    isMouseOverTiles = true;
}

function handleMouseLeaveTiles() {
    isMouseOverTiles = false;
    checkAndHideTiles();
}

function checkAndHideTiles() {
    setTimeout(() => {
        if (!isMouseOverTimeline && !isMouseOverTiles) {
            console.log("Mouse outside (desktop hover), hiding tiles.");
            hideTilesAndDeselect();
        }
    }, 100);
}

function handleYearHover(event) {
    // If on mobile, hover does nothing
    if (!window.matchMedia("(min-width: 769px)").matches) {
        return;
    }

    const selectedLi = event.target;
    if (!selectedLi || selectedLi.tagName !== 'LI') return;
    const selectedYear = selectedLi.dataset.year;
    if (selectedYear === currentSelectedYear) return; // Avoid re-processing same year hover

    showTilesForYear(selectedLi);
}

function hideTilesAndDeselect() {
    console.log("Hiding tiles and deselecting year.");
    const tilesContainer = document.querySelector('.tiles-container');
    const svgLine = document.getElementById('connector-line');
    if (tilesContainer) {
        tilesContainer.classList.remove('tiles-visible');
        tilesContainer.style.removeProperty('transform');
    }
    if (svgLine) {
        svgLine.setAttribute('points', '');
    }
    document.querySelectorAll('.timeline li').forEach(li => {
        li.classList.remove('selected');
    });
    currentSelectedYear = null;
}

function drawConnectorLine(selectedLi) {
    const svg = document.getElementById('connector-svg');
    const line = document.getElementById('connector-line');
    const tilesContainer = document.querySelector('.tiles-container');
    if (!svg || !line || !tilesContainer || !selectedLi) return;

    requestAnimationFrame(() => {
        const svgRect = svg.getBoundingClientRect();
        const liRect = selectedLi.getBoundingClientRect();
        const tilesRect = tilesContainer.getBoundingClientRect();
        const bulletCenterOffset = 55;
        const startX = liRect.left + bulletCenterOffset - svgRect.left;
        const startY = liRect.top - svgRect.top + (liRect.height / 2);
        const endX = tilesRect.left - svgRect.left;
        const endY = startY;
        const points = `${startX.toFixed(1)},${startY.toFixed(1)} ${endX.toFixed(1)},${endY.toFixed(1)}`;
        line.setAttribute('points', points);
        line.style.display = 'block';
    });
}

function displayTiles(year) {
    const tilesDisplayArea = document.querySelector('.tiles-container .tiles');
    const titleElement = document.getElementById('selected-year-title');
    if (!tilesDisplayArea || !titleElement) return;

    titleElement.textContent = year;
    tilesDisplayArea.innerHTML = '';
    const tilesData = timelineData[year] || [];
    const checkedCategories = getCheckedCategories();
    const filteredTiles = tilesData.filter(tile =>
        !tile.category || checkedCategories.includes(tile.category)
    );

    if (filteredTiles.length === 0) {
        tilesDisplayArea.textContent = 'No items available for this year or matching the selected filters.';
        return;
    }

    filteredTiles.forEach((tileInfo) => {
        const tileElement = document.createElement('div');
        tileElement.classList.add('tile');

        // --- ADD Conditional Image --- 
        if (tileInfo.photo) {
            const img = document.createElement('img');
            img.src = tileInfo.photo;
            // Add alt text - use caption or a default
            img.alt = tileInfo.caption || `Image for ${tileInfo.year}`;
            // Optional: Add error handling for the image itself
            img.onerror = function() { 
                this.style.display='none'; // Hide img if it fails to load
                console.warn(`Image failed to load: ${this.src}`);
            };
            tileElement.appendChild(img);
        }
        // --- END Conditional Image ---

        const caption = document.createElement('div');
        caption.classList.add('caption');
        caption.textContent = tileInfo.caption || 'No caption';
        tileElement.appendChild(caption);
        if (tileInfo.category) {
            const category = document.createElement('div');
            category.classList.add('category');
            const formattedCategory = tileInfo.category.charAt(0).toUpperCase() + tileInfo.category.slice(1);
            category.textContent = `Category: ${formattedCategory}`;
            tileElement.appendChild(category);
        }
        tilesDisplayArea.appendChild(tileElement);
    });
}

function getCheckedCategories() {
    const checkedBoxes = document.querySelectorAll('#filter-container input[type="checkbox"]:checked');
    return Array.from(checkedBoxes).map(cb => cb.value);
}

// ADD Mobile click handler
function handleYearClickMobile(event) {
    // If on desktop, click does nothing (handled by hover/pin)
    if (window.matchMedia("(min-width: 769px)").matches) {
        return;
    }

    // Mobile Click Logic:
    const selectedLi = event.target;
    if (!selectedLi || selectedLi.tagName !== 'LI') return;
    const clickedYear = selectedLi.dataset.year;
    const tilesContainer = document.querySelector('.tiles-container');
    if (!tilesContainer) return;

    // If clicking the currently shown year, hide it
    if (clickedYear === currentSelectedYear && tilesContainer.classList.contains('tiles-visible')) {
        console.log("Mobile: Clicked same year, hiding.");
        hideTilesAndDeselect();
    } else {
        // Otherwise, show the clicked year's tiles
        console.log("Mobile: Clicked year, showing.");
        showTilesForYear(selectedLi);
    }
}

// ADD Mobile outside click handler
function handleOutsideClickMobile(event) {
    // Only act on mobile
    if (window.matchMedia("(min-width: 769px)").matches) {
        return;
    }
    
    const timelineContainer = document.querySelector('.timeline-container');
    const tilesContainer = document.querySelector('.tiles-container');

    // If tiles are visible and click is outside timeline/tiles
    if (currentSelectedYear && 
        tilesContainer && tilesContainer.classList.contains('tiles-visible') &&
        (!timelineContainer || !timelineContainer.contains(event.target)) && 
        (!tilesContainer || !tilesContainer.contains(event.target))) 
    {
        console.log("Mobile: Clicked outside, hiding.");
        hideTilesAndDeselect();
    }
}

// Function to show/update tiles (used by both hover and click)
function showTilesForYear(selectedLi) {
    const selectedYear = selectedLi.dataset.year;
    currentSelectedYear = selectedYear; // Update selected year regardless of pin state

    const container = document.querySelector('.container');
    const tilesContainer = document.querySelector('.tiles-container');
    if (!container || !tilesContainer) return;

    console.log(`Showing year: ${selectedYear}`);

    // Deselect others first
    document.querySelectorAll('.timeline li').forEach(li => {
        if (li !== selectedLi) {
            li.classList.remove('selected');
        }
    });
    selectedLi.classList.add('selected');

    // --- Vertical Alignment (Using Transform) - DESKTOP ONLY --- 
    if (window.matchMedia("(min-width: 769px)").matches) {
        const containerRect = container.getBoundingClientRect();
        const liRect = selectedLi.getBoundingClientRect();
        const liMidpointY_viewport = liRect.top + (liRect.height / 2);
        const liMidpointY_container = liMidpointY_viewport - containerRect.top;
        let targetTop = liMidpointY_container - (tilesContainer.offsetHeight / 3);
        const marginTop = 20;
        const marginBottom = 20;
        const containerHeight = container.clientHeight;
        const minTop = marginTop;
        const maxTop = containerHeight - tilesContainer.offsetHeight - marginBottom;
        targetTop = Math.max(minTop, Math.min(targetTop, maxTop));
        targetTop = isNaN(targetTop) ? minTop : targetTop;
        const naturalTop = marginTop;
        const adjustedTranslateY = targetTop - naturalTop;
        tilesContainer.style.transform = `translateY(${adjustedTranslateY}px)`;
    } else {
        // On mobile, ensure transform is cleared
        tilesContainer.style.removeProperty('transform');
    }

    // --- Connector Line - DESKTOP ONLY --- 
    if (window.matchMedia("(min-width: 769px)").matches) {
        drawConnectorLine(selectedLi);
    } else {
        // Hide line on mobile by clearing points
        const svgLine = document.getElementById('connector-line');
        if (svgLine) {
            svgLine.setAttribute('points', '');
        }
    }

    // --- Show Tiles --- 
    tilesContainer.classList.add('tiles-visible');
    displayTiles(selectedYear);

    // Scroll tiles into view on mobile 
    if (!window.matchMedia("(min-width: 769px)").matches) {
        setTimeout(() => {
            tilesContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 50); 
    }
} 