// Tank Database - Complete list of all tanks in Hell Let Loose

// Game Version Management
let currentGameVersion = 'wwii';

// Simple Comparison Functions
let selectedTank1 = null;
let selectedTank2 = null;

// Cache busting using jekyll build time
let buildVersion = document.querySelector('meta[property="build.version"]').content;
if (buildVersion.startsWith("{{")) {
    buildVersion = new Date().toISOString();
}

function toggleComparisonMode() {
    if (!compareToggle || !comparisonPanel) {
        return;
    }

    comparisonMode = !comparisonMode;
    compareToggle.classList.toggle('active', comparisonMode);

    if (comparisonMode) {
        comparisonPanel.style.display = 'block';
        // Show compare buttons on all tank cards
        showCompareButtons();
    } else {
        comparisonPanel.style.display = 'none';
        // Hide compare buttons and reset selection
        hideCompareButtons();
        resetComparison();
    }
}

function showCompareButtons() {
    const tankCards = document.querySelectorAll('.tank-card');
    tankCards.forEach(card => {
        if (!card.querySelector('.compare-btn')) {
            const compareBtn = document.createElement('button');
            compareBtn.className = 'compare-btn';
            compareBtn.innerHTML = '<i class="fas fa-balance-scale"></i>';
            compareBtn.onclick = (e) => {
                e.stopPropagation();
                selectTankForComparison(card);
            };
            card.appendChild(compareBtn);
        }

        // Check if this tank is currently selected and mark it
        const tankName = card.querySelector('.tank-name').textContent;
        if (selectedTank1 && selectedTank1.name === tankName) {
            card.querySelector('.compare-btn').classList.add('selected');
        } else if (selectedTank2 && selectedTank2.name === tankName) {
            card.querySelector('.compare-btn').classList.add('selected');
        }
    });
}

function hideCompareButtons() {
    const compareBtns = document.querySelectorAll('.compare-btn');
    compareBtns.forEach(btn => btn.remove());
}

function selectTankForComparison(tankCard) {
    const tankName = tankCard.querySelector('.tank-name').textContent;
    const tank = findTankByName(tankName);

    if (!tank) {
        return;
    }

    if (!selectedTank1) {
        // Select first tank
        selectedTank1 = tank;
        updateTankDisplay('tank1', tank);
        tankCard.querySelector('.compare-btn').classList.add('selected');
    } else if (tank === selectedTank1) {
        // Deselect tank 1
        selectedTank1 = null;
        document.getElementById('tank1Name').textContent = 'Select First Tank';
        document.getElementById('tank1Type').textContent = 'Click a tank tile to compare';
        tankCard.querySelector('.compare-btn').classList.remove('selected');
        if (selectedTank2) {
            selectedTank2 = null;
            document.getElementById('tank2Name').textContent = 'Select Second Tank';
            document.getElementById('tank2Type').textContent = 'Click another tank tile to compare';
            document.querySelectorAll('.compare-btn.selected').forEach(btn => btn.classList.remove('selected'));
        }
    } else {
        // Replace tank 2 (or select if none selected)
        if (selectedTank2) {
            // Remove selection from previous tank 2
            const previousTank2Card = findTankCardByName(selectedTank2.name);
            if (previousTank2Card) {
                previousTank2Card.querySelector('.compare-btn').classList.remove('selected');
            }
        }
        selectedTank2 = tank;
        updateTankDisplay('tank2', tank);
        tankCard.querySelector('.compare-btn').classList.add('selected');
        generateComparisonStats();
    }
}

function findTankByName(name) {
    for (const faction in tankDatabase) {
        const tank = tankDatabase[faction].find(t => t.name === name);
        if (tank) return tank;
    }
    return null;
}

function findTankCardByName(name) {
    const tankCards = document.querySelectorAll('.tank-card');
    for (const card of tankCards) {
        const tankName = card.querySelector('.tank-name').textContent;
        if (tankName === name) return card;
    }
    return null;
}

function updateTankDisplay(tankNumber, tank) {
    const nameElement = document.getElementById(tankNumber + 'Name');
    const typeElement = document.getElementById(tankNumber + 'Type');

    if (nameElement && typeElement) {
        nameElement.textContent = tank.name;
        typeElement.textContent = `${tank.type} • ${tank.faction}`;
    }

    // Update comparison stats if both tanks are selected
    if (selectedTank1 && selectedTank2) {
        generateComparisonStats();
    }
}

function generateComparisonStats() {
    const comparisonStats = document.getElementById('comparisonStats');

    if (!selectedTank1 || !selectedTank2) return;

    const stats = [
        {label: 'Hull Health', key: 'hullHealth', unit: ''},
        {label: 'Turret Health', key: 'turretHealth', unit: ''},
        {label: 'Engine Health', key: 'engineHealth', unit: ''},
        {label: 'Track Health', key: 'trackHealth', unit: ''},
        {label: 'AP Damage', key: 'apDamage', unit: ''},
        {label: 'Max Speed', key: 'maxSpeed', unit: ' km/h'},
        {label: 'Reload Speed', key: 'reloadSpeed', unit: 's'},
        {label: 'Yaw Rate', key: 'yawRate', unit: '°/s'},
        {label: 'Pitch Rate', key: 'pitchRate', unit: '°/s'},
        {label: 'Max AP Shells', key: 'maxShellsAP', unit: ''},
        {label: 'Max HE Shells', key: 'maxShellsHE', unit: ''},
        {label: 'Fuel Cost', key: 'fuelCost', unit: ''}
    ];

    let statsHTML = `
        <h4>Detailed Comparison</h4>
        <div class="comparison-stats-grid">
    `;

    stats.forEach(stat => {
        const value1 = selectedTank1.detailedStats ? selectedTank1.detailedStats[stat.key] : 'N/A';
        const value2 = selectedTank2.detailedStats ? selectedTank2.detailedStats[stat.key] : 'N/A';

        let difference = '';
        let differenceClass = 'neutral';
        let winner = '';

        if (value1 !== 'N/A' && value2 !== 'N/A') {
            const diff = value1 - value2;
            if (diff > 0) {
                difference = `+${diff}`;
                differenceClass = 'positive';
                winner = 'tank1';
            } else if (diff < 0) {
                difference = `${diff}`;
                differenceClass = 'negative';
                winner = 'tank2';
            } else {
                difference = '0';
                differenceClass = 'neutral';
            }
        }

        statsHTML += `
            <div class="comparison-stat">
                <div class="comparison-stat-label">${stat.label}</div>
                <div class="comparison-stat-values">
                    <div class="comparison-stat-value ${winner === 'tank1' ? 'winner' : ''}">
                        ${value1}${stat.unit}
                    </div>
                    <div class="comparison-stat-difference ${differenceClass}">
                        ${difference}
                    </div>
                    <div class="comparison-stat-value ${winner === 'tank2' ? 'winner' : ''}">
                        ${value2}${stat.unit}
                    </div>
                </div>
            </div>
        `;
    });

    statsHTML += '</div>';
    comparisonStats.innerHTML = statsHTML;
}

function resetComparison() {
    selectedTank1 = null;
    selectedTank2 = null;
    document.getElementById('tank1Name').textContent = 'Select First Tank';
    document.getElementById('tank1Type').textContent = 'Click a tank tile to compare';
    document.getElementById('tank2Name').textContent = 'Select Second Tank';
    document.getElementById('tank2Type').textContent = 'Click another tank tile to compare';
    document.getElementById('comparisonStats').innerHTML = '';
}

// Initialize game version dropdown
document.addEventListener('DOMContentLoaded', function () {
    const gameVersionToggle = document.getElementById('gameVersionToggle');
    const gameVersionMenu = document.getElementById('gameVersionMenu');
    const versionOptions = document.querySelectorAll('.version-option');
    
    if (gameVersionToggle && gameVersionMenu) {
        // Toggle dropdown
        gameVersionToggle.addEventListener('click', function (e) {
            e.stopPropagation();
            gameVersionMenu.classList.toggle('active');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function () {
            gameVersionMenu.classList.remove('active');
        });
        
        // Handle version selection
        versionOptions.forEach(option => {
            option.addEventListener('click', function (e) {
                e.stopPropagation();
                const version = this.getAttribute('data-version');
                switchGameVersion(version);
                gameVersionMenu.classList.remove('active');
            });
        });
    }
});

function switchGameVersion(version) {
    if (version === currentGameVersion) return;
    
    currentGameVersion = version;
    
    // Update dropdown display
    const currentVersionSpan = document.querySelector('.current-version');
    const versionOptions = document.querySelectorAll('.version-option');
    
    if (currentVersionSpan) {
        currentVersionSpan.textContent = version === 'wwii' ? 'HLL: WWII' : 'HLL: V';
    }
    
    // Update active states
    versionOptions.forEach(option => {
        option.classList.remove('active');
        if (option.getAttribute('data-version') === version) {
            option.classList.add('active');
        }
    });
    
    // Switch sections
    const allSections = document.querySelectorAll('.section');
    const vietnamSection = document.getElementById('vietnam');
    const navigation = document.querySelector('.nav');
    const logoContainer = document.querySelector('.logo-container');
    const footer = document.querySelector('.footer');
    
    if (version === 'vietnam') {
        // Hide all WWII sections
        allSections.forEach(section => {
            if (section.id !== 'vietnam') {
                section.classList.remove('active');
            }
        });
        
        // Show Vietnam section
        if (vietnamSection) {
            vietnamSection.classList.add('active');
        }
        
                        // Hide navigation, logo click functionality, and footer
                if (navigation) {
                    navigation.style.display = 'none';
                }
                if (logoContainer) {
                    logoContainer.style.pointerEvents = 'none';
                    logoContainer.style.opacity = '0.5';
                }
                if (footer) {
                    footer.style.display = 'none';
                }

        // Hide theme selector when in Vietnam mode
        const themeSelector = document.querySelector('.theme-selector');
        if (themeSelector) {
            themeSelector.style.display = 'none';
                }

                // Apply jungle theme to the body
                document.body.classList.add('vietnam-jungle-theme');
        
        // Update navigation
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => link.classList.remove('active'));
        
    } else {
        // Hide Vietnam section
        if (vietnamSection) {
            vietnamSection.classList.remove('active');
        }
        
        // Show overview section (default WWII)
        const overviewSection = document.getElementById('overview');
        if (overviewSection) {
            overviewSection.classList.add('active');
        }
        
                        // Show navigation, restore logo click functionality, and show footer
                if (navigation) {
                    navigation.style.display = 'flex';
                }
                if (logoContainer) {
                    logoContainer.style.pointerEvents = 'auto';
                    logoContainer.style.opacity = '1';
                }
                if (footer) {
                    footer.style.display = 'block';
                }

        // Show theme selector when back to WWII mode
        const themeSelector = document.querySelector('.theme-selector');
        if (themeSelector) {
            themeSelector.style.display = 'block';
                }

                // Remove jungle theme from the body
                document.body.classList.remove('vietnam-jungle-theme');
        
        // Update navigation
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            if (link.getAttribute('href') === '#overview') {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }
}

const tankDatabase = {
    usa: [
        {
            name: "M4 Sherman",
            type: "Medium Tank",
            faction: "USA",
            armor: "Front: 63mm, Sides: 38mm, Rear: 38mm",
            gun: "75mm M3",
            penetration: "Front: 76mm, Sides: 89mm",
            speed: "29 km/h",
            crew: "3",
            description: "The workhorse of the US Army. Balanced armor and firepower with good mobility.",
            weakSpots: "Turret ring, sides, rear",
            strengths: "Reliable, good mobility, decent armor",
            icon: "fas fa-tank",
            has360View: true,
            images360: {
                prefix: "images/360/m4-sherman/",
                suffix: ".webp"
            },
            detailedStats: {
                hullHealth: 890,
                turretHealth: 790,
                engineHealth: 420,
                trackHealth: 710,
                apDamage: 650,
                explosionDamage: 100,
                explosionRadius: 1000,
                reloadSpeed: 6.0,
                maxSpeed: 29,
                yawRate: 14.0,
                pitchRate: 5.0,
                pitchAngleMin: -10.0,
                pitchAngleMax: 25.0,
                gearSwitchTime: 0.7,
                maxShellsAP: 35,
                maxShellsHE: 35,
                fuelCost: 200
            }
        },
        {
            name: "Sherman 75 Jumbo",
            type: "Heavy Tank",
            faction: "USA",
            armor: "Front: 101mm, Sides: 76mm, Rear: 51mm",
            gun: "75mm M3",
            penetration: "Front: 76mm, Sides: 89mm",
            speed: "20 km/h",
            crew: "3",
            description: "Heavily armored Sherman variant with thick frontal armor for breakthrough operations.",
            weakSpots: "Sides, rear. This tank has a 75mm gun so this cannot pen heavy tank armor from the front. This tank almost should never be used as the price of fuel is not logical as compared to a 76 jumbo",
            strengths: "Good first gear and reverse gear speed. These tanks are good for playing off of cover. Excellent frontal armor, good mobility for heavy tank",
            icon: "fas fa-tank",
            has360View: true,
            images360: {
                prefix: "images/360/sherman-75-jumbo/",
                suffix: ".webp"
            },
            detailedStats: {
                hullHealth: 1170,
                turretHealth: 1050,
                engineHealth: 550,
                trackHealth: 910,
                apDamage: 700,
                explosionDamage: 100,
                explosionRadius: 1200,
                reloadSpeed: 6.0,
                maxSpeed: 20,
                yawRate: 14.0,
                pitchRate: 6.0,
                pitchAngleMin: -10.0,
                pitchAngleMax: 25.0,
                gearSwitchTime: 0.9,
                maxShellsAP: 25,
                maxShellsHE: 60,
                fuelCost: 500
            }
        },
        {
            name: "Sherman 76 Jumbo",
            type: "Heavy Tank",
            faction: "USA",
            armor: "Front: 101mm, Sides: 76mm, Rear: 51mm",
            gun: "76mm M1A1",
            penetration: "Front: 116mm, Sides: 139mm",
            speed: "20 km/h",
            crew: "3",
            description: "Heavily armored Sherman with improved 76mm gun for better anti-tank capability.",
            weakSpots: "Sides, rear",
            strengths: "Good first gear and reverse gear speed. These tanks are good for playing off of cover. Excellent frontal armor, good firepower",
            icon: "fas fa-tank",
            has360View: true,
            images360: {
                prefix: "images/360/sherman-76-jumbo/",
                suffix: ".webp"
            },
            detailedStats: {
                hullHealth: 1190,
                turretHealth: 1070,
                engineHealth: 550,
                trackHealth: 910,
                apDamage: 800,
                explosionDamage: 100,
                explosionRadius: 1200,
                reloadSpeed: 8.0,
                maxSpeed: 20,
                yawRate: 12.0,
                pitchRate: 5.0,
                pitchAngleMin: -8.0,
                pitchAngleMax: 23.0,
                gearSwitchTime: 0.9,
                maxShellsAP: 45,
                maxShellsHE: 30,
                fuelCost: 600
            }
        },
        {
            name: "M5A1 Stuart",
            type: "Light Tank",
            faction: "USA",
            armor: "Front: 44mm, Sides: 25mm, Rear: 25mm",
            gun: "37mm M6",
            penetration: "Front: 61mm, Sides: 76mm",
            speed: "34 km/h",
            crew: "3",
            description: "Fast light tank with light armor but excellent mobility.",
            weakSpots: "All sides vulnerable",
            strengths: "Very fast, good for scouting",
            icon: "fas fa-tank",
            has360View: true,
            images360: {
                prefix: "images/360/m5a1-stuart/",
                suffix: ".webp"
            },
            detailedStats: {
                hullHealth: 620,
                turretHealth: 550,
                engineHealth: 290,
                trackHealth: 490,
                apDamage: 420,
                explosionDamage: 90,
                explosionRadius: 800,
                reloadSpeed: 4.0,
                maxSpeed: 34,
                yawRate: 14.0,
                pitchRate: 6.0,
                pitchAngleMin: -12.0,
                pitchAngleMax: 20.0,
                gearSwitchTime: 0.6,
                maxShellsAP: 50,
                maxShellsHE: 50,
                fuelCost: 150
            }
        },
        {
            name: "Greyhound",
            type: "Recon Vehicle",
            faction: "USA",
            armor: "Front: 25mm, Sides: 13mm, Rear: 13mm",
            gun: "37mm M6",
            penetration: "Front: 61mm, Sides: 76mm",
            speed: "80 km/h",
            crew: "3",
            description: "Fast armored car with excellent mobility for reconnaissance and harassment.",
            weakSpots: "All sides vulnerable",
            strengths: "Extremely fast, excellent for scouting",
            icon: "fas fa-car",
            has360View: true,
            images360: {
                prefix: "images/360/greyhound/",
                suffix: ".webp"
            },
            detailedStats: {
                hullHealth: null,
                turretHealth: null,
                engineHealth: null,
                trackHealth: null,
                apDamage: null,
                explosionDamage: null,
                explosionRadius: null,
                reloadSpeed: null,
                maxSpeed: null,
                yawRate: null,
                pitchRate: null,
                pitchAngleMin: null,
                pitchAngleMax: null,
                gearSwitchTime: null,
                maxShellsAP: null,
                maxShellsHE: null,
                fuelCost: null
            }
        },
        {
            name: "Sherman M4A3 105",
            type: "SPA (Self Propelled Artillery)",
            faction: "USA",
            armor: "TBD",
            gun: "105mm M4",
            penetration: "TBD",
            speed: "TBD",
            crew: "3",
            description: "Self-propelled artillery variant of the M4 Sherman.",
            weakSpots: "TBD",
            strengths: "TBD",
            icon: "fas fa-tank",
            has360View: true,
            images360: {
                prefix: "images/360/Sherman SPA/",
                suffix: ".webp"
            },
            detailedStats: {
                hullHealth: null,
                turretHealth: null,
                engineHealth: null,
                trackHealth: null,
                apDamage: null,
                explosionDamage: null,
                explosionRadius: null,
                reloadSpeed: null,
                maxSpeed: null,
                yawRate: null,
                pitchRate: null,
                pitchAngleMin: null,
                pitchAngleMax: null,
                gearSwitchTime: null,
                maxShellsAP: null,
                maxShellsHE: null,
                fuelCost: null
            }
        }
    ],
    germany: [
        {
            name: "Panzer IV",
            type: "Medium Tank",
            faction: "Germany",
            armor: "Front: 80mm, Sides: 30mm, Rear: 20mm",
            gun: "75mm KwK 40",
            penetration: "Front: 98mm, Sides: 121mm",
            speed: "27 km/h",
            crew: "3",
            description: "Versatile medium tank with good balance of armor, firepower, and mobility.",
            weakSpots: "Sides, rear",
            strengths: "Good firepower, decent armor",
            icon: "fas fa-tank",
            has360View: true,
            images360: {
                prefix: "images/360/panzer-iv/",
                suffix: ".webp"
            },
            detailedStats: {
                hullHealth: 910,
                turretHealth: 830,
                engineHealth: 430,
                trackHealth: 710,
                apDamage: 750,
                explosionDamage: 100,
                explosionRadius: 1000,
                reloadSpeed: 6.0,
                maxSpeed: 27,
                yawRate: 10.0,
                pitchRate: 5.0,
                pitchAngleMin: -8.0,
                pitchAngleMax: 20.0,
                gearSwitchTime: 0.8,
                maxShellsAP: 50,
                maxShellsHE: 35,
                fuelCost: 200
            }
        },
        {
            name: "Panther",
            type: "Heavy Tank",
            faction: "Germany",
            armor: "Front: 80mm, Sides: 40mm, Rear: 40mm",
            gun: "75mm KwK 42",
            penetration: "Front: 149mm, Sides: 185mm",
            speed: "26 km/h",
            crew: "3",
            description: "Excellent heavy tank with sloped armor and powerful long-barreled 75mm gun.",
            weakSpots: "Sides, rear. Very slow reverse gear and third to fourth gear. Be very mindful of RPM's as you speed up",
            strengths: "Really good top end speed, fastest heavy tank. Excellent gun, good armor, decent speed",
            icon: "fas fa-tank",
            has360View: true,
            images360: {
                prefix: "images/360/panther/",
                suffix: ".webp"
            },
            detailedStats: {
                hullHealth: 1170,
                turretHealth: 990,
                engineHealth: 550,
                trackHealth: 910,
                apDamage: 800,
                explosionDamage: 100,
                explosionRadius: 1200,
                reloadSpeed: 8.0,
                maxSpeed: 26,
                yawRate: 12.0,
                pitchRate: 5.0,
                pitchAngleMin: -8.0,
                pitchAngleMax: 18.0,
                gearSwitchTime: 0.85,
                maxShellsAP: 40,
                maxShellsHE: 40,
                fuelCost: 600
            }
        },
        {
            name: "Tiger I",
            type: "Heavy Tank",
            faction: "Germany",
            armor: "Front: 100mm, Sides: 80mm, Rear: 80mm",
            gun: "88mm KwK 36",
            penetration: "Front: 165mm, Sides: 198mm",
            speed: "23 km/h",
            crew: "3",
            description: "Fearsome heavy tank with thick armor and devastating 88mm gun.",
            weakSpots: "Sides, rear",
            strengths: "Good first gear and reverse gear speed. These tanks are good for playing off of cover. Excellent armor, devastating gun",
            icon: "fas fa-tank",
            has360View: true,
            images360: {
                prefix: "images/360/tiger-i/",
                suffix: ".webp"
            },
            detailedStats: {
                hullHealth: 1220,
                turretHealth: 1070,
                engineHealth: 570,
                trackHealth: 950,
                apDamage: 850,
                explosionDamage: 100,
                explosionRadius: 1200,
                reloadSpeed: 8.0,
                maxSpeed: 23,
                yawRate: 7.0,
                pitchRate: 4.5,
                pitchAngleMin: -8.0,
                pitchAngleMax: 15.0,
                gearSwitchTime: 1.0,
                maxShellsAP: 55,
                maxShellsHE: 40,
                fuelCost: 600
            }
        },
        {
            name: "Luchs",
            type: "Light Tank",
            faction: "Germany",
            armor: "Front: 30mm, Sides: 15mm, Rear: 15mm",
            gun: "20mm KwK 30",
            penetration: "Front: 23mm, Sides: 29mm",
            speed: "37 km/h",
            crew: "3",
            description: "Light tank with minimal armor and anti-infantry armament.",
            weakSpots: "All sides vulnerable",
            strengths: "Fast, good for scouting",
            icon: "fas fa-tank",
            has360View: true,
            images360: {
                prefix: "images/360/luchs/",
                suffix: ".webp"
            },
            detailedStats: {
                hullHealth: 600,
                turretHealth: 520,
                engineHealth: 280,
                trackHealth: 470,
                apDamage: 180,
                explosionDamage: 90,
                explosionRadius: 800,
                reloadSpeed: 8.0,
                maxSpeed: 37,
                yawRate: 22.0,
                pitchRate: 8.0,
                pitchAngleMin: -9.0,
                pitchAngleMax: 18.0,
                gearSwitchTime: 0.6,
                maxShellsAP: 0,
                maxShellsHE: 20,
                fuelCost: 150
            }
        },
        {
            name: "Puma",
            type: "Recon Vehicle",
            faction: "Germany",
            armor: "Front: 30mm, Sides: 15mm, Rear: 15mm",
            gun: "50mm KwK 39",
            penetration: "Front: 67mm, Sides: 84mm",
            speed: "85 km/h",
            crew: "3",
            description: "Fast armored car with good anti-tank capability and excellent mobility.",
            weakSpots: "All sides vulnerable",
            strengths: "Extremely fast, good anti-tank gun",
            icon: "fas fa-car",
            has360View: true,
            images360: {
                prefix: "images/360/puma/",
                suffix: ".webp"
            },
            detailedStats: {
                hullHealth: null,
                turretHealth: null,
                engineHealth: null,
                trackHealth: null,
                apDamage: null,
                explosionDamage: null,
                explosionRadius: null,
                reloadSpeed: null,
                maxSpeed: null,
                yawRate: null,
                pitchRate: null,
                pitchAngleMin: null,
                pitchAngleMax: null,
                gearSwitchTime: null,
                maxShellsAP: null,
                maxShellsHE: null,
                fuelCost: null
            }
        },
        {
            name: "Sturmpanzer IV Brummbar",
            type: "SPA (Self Propelled Artillery)",
            faction: "Germany",
            armor: "TBD",
            gun: "150mm StuH 43",
            penetration: "TBD",
            speed: "TBD",
            crew: "3",
            description: "Self-propelled artillery based on the Panzer IV chassis.",
            weakSpots: "TBD",
            strengths: "TBD",
            icon: "fas fa-tank",
            has360View: true,
            images360: {
                prefix: "images/360/Bummbar SPA/",
                suffix: ".webp"
            },
            detailedStats: {
                hullHealth: null,
                turretHealth: null,
                engineHealth: null,
                trackHealth: null,
                apDamage: null,
                explosionDamage: null,
                explosionRadius: null,
                reloadSpeed: null,
                maxSpeed: null,
                yawRate: null,
                pitchRate: null,
                pitchAngleMin: null,
                pitchAngleMax: null,
                gearSwitchTime: null,
                maxShellsAP: null,
                maxShellsHE: null,
                fuelCost: null
            }
        },
        {
            name: "Panzer III Ausf.N",
            type: "SPA (Self Propelled Artillery)",
            faction: "Germany",
            armor: "TBD",
            gun: "75mm KwK 37 L/24",
            penetration: "TBD",
            speed: "TBD",
            crew: "3",
            description: "Self-propelled artillery variant of the Panzer III.",
            weakSpots: "TBD",
            strengths: "TBD",
            icon: "fas fa-tank",
            has360View: true,
            images360: {
                prefix: "images/360/Panzer III SPA/",
                suffix: ".webp"
            },
            detailedStats: {
                hullHealth: null,
                turretHealth: null,
                engineHealth: null,
                trackHealth: null,
                apDamage: null,
                explosionDamage: null,
                explosionRadius: null,
                reloadSpeed: null,
                maxSpeed: null,
                yawRate: null,
                pitchRate: null,
                pitchAngleMin: null,
                pitchAngleMax: null,
                gearSwitchTime: null,
                maxShellsAP: null,
                maxShellsHE: null,
                fuelCost: null
            }
        }
    ],
    soviet: [
        {
            name: "T-34",
            type: "Medium Tank",
            faction: "Soviet Union",
            armor: "Front: 45mm, Sides: 45mm, Rear: 45mm",
            gun: "76.2mm F-34",
            penetration: "Front: 76mm, Sides: 89mm",
            speed: "31 km/h",
            crew: "3",
            description: "Revolutionary tank with sloped armor and good mobility.",
            weakSpots: "Sides, rear",
            strengths: "Good mobility, sloped armor",
            icon: "fas fa-tank",
            has360View: true,
            images360: {
                prefix: "images/360/t-34/",
                suffix: ".webp"
            },
            detailedStats: {
                hullHealth: 890,
                turretHealth: 830,
                engineHealth: 420,
                trackHealth: 700,
                apDamage: 750,
                explosionDamage: 100,
                explosionRadius: 1000,
                reloadSpeed: 6.0,
                maxSpeed: 31,
                yawRate: 15.0,
                pitchRate: 6.0,
                pitchAngleMin: -5.0,
                pitchAngleMax: 29.0,
                gearSwitchTime: 0.9,
                maxShellsAP: 40,
                maxShellsHE: 45,
                fuelCost: 200
            }
        },
        {
            name: "IS-1",
            type: "Heavy Tank",
            faction: "Soviet Union",
            armor: "Front: 120mm, Sides: 90mm, Rear: 60mm",
            gun: "85mm D-5T",
            penetration: "Front: 102mm, Sides: 119mm",
            speed: "21 km/h",
            crew: "3",
            description: "Heavy breakthrough tank with thick armor and good firepower.",
            weakSpots: "Sides, rear",
            strengths: "Excellent armor, good firepower",
            icon: "fas fa-tank",
            has360View: true,
            images360: {
                prefix: "images/360/is-1/",
                suffix: ".webp"
            },
            detailedStats: {
                hullHealth: 1220,
                turretHealth: 1060,
                engineHealth: 570,
                trackHealth: 950,
                apDamage: 800,
                explosionDamage: 100,
                explosionRadius: 1200,
                reloadSpeed: 8.0,
                maxSpeed: 21,
                yawRate: 8.0,
                pitchRate: 4.5,
                pitchAngleMin: -4.0,
                pitchAngleMax: 22.0,
                gearSwitchTime: 1.0,
                maxShellsAP: 40,
                maxShellsHE: 35,
                fuelCost: 600
            }
        },
        {
            name: "T-70",
            type: "Light Tank",
            faction: "Soviet Union",
            armor: "Front: 35mm, Sides: 35mm, Rear: 25mm",
            gun: "45mm 20-K",
            penetration: "Front: 51mm, Sides: 61mm",
            speed: "32 km/h",
            crew: "3",
            description: "Light tank with minimal armor and small crew.",
            weakSpots: "All sides vulnerable",
            strengths: "Fast, small target",
            icon: "fas fa-tank",
            has360View: true,
            images360: {
                prefix: "images/360/t-70/",
                suffix: ".webp"
            },
            detailedStats: {
                hullHealth: 630,
                turretHealth: 550,
                engineHealth: 290,
                trackHealth: 490,
                apDamage: 400,
                explosionDamage: 90,
                explosionRadius: 800,
                reloadSpeed: 4.0,
                maxSpeed: 32,
                yawRate: 10.0,
                pitchRate: 5.0,
                pitchAngleMin: -6.0,
                pitchAngleMax: 20.0,
                gearSwitchTime: 0.7,
                maxShellsAP: 45,
                maxShellsHE: 45,
                fuelCost: 150
            }
        },
        {
            name: "BA-10 Scout Car",
            type: "Recon Vehicle",
            faction: "Soviet Union",
            armor: "Front: 10mm, Sides: 10mm, Rear: 10mm",
            gun: "45mm 20-K",
            penetration: "Front: 51mm, Sides: 61mm",
            speed: "53 km/h",
            crew: "3",
            description: "Light armored car with good mobility for reconnaissance missions.",
            weakSpots: "All sides vulnerable",
            strengths: "Fast, good for scouting",
            icon: "fas fa-car",
            has360View: true,
            images360: {
                prefix: "images/360/ba-10-scout-car/",
                suffix: ".webp"
            },
            detailedStats: {
                hullHealth: null,
                turretHealth: null,
                engineHealth: null,
                trackHealth: null,
                apDamage: null,
                explosionDamage: null,
                explosionRadius: null,
                reloadSpeed: null,
                maxSpeed: null,
                yawRate: null,
                pitchRate: null,
                pitchAngleMin: null,
                pitchAngleMax: null,
                gearSwitchTime: null,
                maxShellsAP: null,
                maxShellsHE: null,
                fuelCost: null
            }
        },
        {
            name: "KV-2",
            type: "SPA (Self Propelled Artillery)",
            faction: "Soviet Union",
            armor: "TBD",
            gun: "152mm M-10T",
            penetration: "TBD",
            speed: "TBD",
            crew: "3",
            description: "Heavy self-propelled artillery with massive 152mm howitzer.",
            weakSpots: "TBD",
            strengths: "TBD",
            icon: "fas fa-tank",
            has360View: true,
            images360: {
                prefix: "images/360/KV-2 SPA/",
                suffix: ".webp"
            },
            detailedStats: {
                hullHealth: null,
                turretHealth: null,
                engineHealth: null,
                trackHealth: null,
                apDamage: null,
                explosionDamage: null,
                explosionRadius: null,
                reloadSpeed: null,
                maxSpeed: null,
                yawRate: null,
                pitchRate: null,
                pitchAngleMin: null,
                pitchAngleMax: null,
                gearSwitchTime: null,
                maxShellsAP: null,
                maxShellsHE: null,
                fuelCost: null
            }
        }
    ],
         british: [
                  {
             name: "Daimler",
             type: "Recon Vehicle",
             faction: "Great Britain",
            armor: "Front: 16mm, Sides: 16mm, Rear: 16mm",
            gun: "40mm QF 2-pounder",
            penetration: "Front: 57mm, Sides: 71mm",
            speed: "80 km/h",
            crew: "3",
            description: "Fast armored car with good mobility for reconnaissance and harassment.",
            weakSpots: "All sides vulnerable",
            strengths: "Extremely fast, good for scouting",
            icon: "fas fa-car",
            has360View: true,
            images360: {
                prefix: "images/360/daimler/",
                suffix: ".webp"
            },
            detailedStats: {
                hullHealth: null,
                turretHealth: null,
                engineHealth: null,
                trackHealth: null,
                apDamage: null,
                explosionDamage: null,
                explosionRadius: null,
                reloadSpeed: null,
                maxSpeed: null,
                yawRate: null,
                pitchRate: null,
                pitchAngleMin: null,
                pitchAngleMax: null,
                gearSwitchTime: null,
                maxShellsAP: null,
                maxShellsHE: null,
                fuelCost: null
            }
         },
                                            {
              name: "M3 Stuart 'Honey'",
              type: "Light Tank",
              faction: "Great Britain",
                          armor: "Front: 38mm, Sides: 25mm, Rear: 25mm",
              gun: "37mm M6",
              penetration: "Front: 61mm, Sides: 76mm",
            speed: "36 km/h",
              crew: "3",
             description: "Fast light tank with light armor but excellent mobility.",
             weakSpots: "All sides vulnerable",
             strengths: "Very fast, good for scouting",
              icon: "fas fa-tank",
              has360View: true,
                          images360: {
                prefix: "images/360/m3-stuart-honey/",
                suffix: ".webp"
            },
            detailedStats: {
                hullHealth: 610,
                turretHealth: 540,
                engineHealth: 290,
                trackHealth: 480,
                apDamage: 420,
                explosionDamage: 90,
                explosionRadius: 800,
                reloadSpeed: 4.0,
                maxSpeed: 36,
                yawRate: 14.0,
                pitchRate: 6.0,
                pitchAngleMin: -12.0,
                pitchAngleMax: 20.0,
                gearSwitchTime: 0.6,
                maxShellsAP: 50,
                maxShellsHE: 50,
                fuelCost: 150
            }
          },
                                  {
                           name: "Tetrarch",
              type: "Light Tank",
              faction: "Great Britain",
             armor: "Front: 14mm, Sides: 10mm, Rear: 10mm",
             gun: "40mm QF 2-pounder",
             penetration: "Front: 57mm, Sides: 71mm",
            speed: "39 km/h",
             crew: "3",
             description: "Ultra-light tank designed for airborne operations with minimal armor.",
            weakSpots: "All sides vulnerable",
            strengths: "Very fast, airborne capable",
            icon: "fas fa-tank",
            has360View: true,
            images360: {
                prefix: "images/360/tetrarch/",
                suffix: ".webp"
            },
            detailedStats: {
                hullHealth: 610,
                turretHealth: 530,
                engineHealth: 290,
                trackHealth: 480,
                apDamage: 380,
                explosionDamage: 90,
                explosionRadius: 800,
                reloadSpeed: 4.0,
                maxSpeed: 39,
                yawRate: 10.0,
                pitchRate: 5.5,
                pitchAngleMin: -10.0,
                pitchAngleMax: 25.0,
                gearSwitchTime: 0.7,
                maxShellsAP: 40,
                maxShellsHE: 40,
                fuelCost: 150
            }
         },
                                  {
             name: "Cromwell",
             type: "Medium Tank",
             faction: "Great Britain",
                         armor: "Front: 76mm, Sides: 32mm, Rear: 32mm",
             gun: "75mm QF Mk V",
             penetration: "Front: 91mm, Sides: 114mm",
            speed: "30 km/h",
             crew: "3",
            description: "Fast medium tank with good mobility and balanced firepower.",
            weakSpots: "Sides, rear",
            strengths: "Excellent speed, good firepower",
            icon: "fas fa-tank",
            has360View: true,
            images360: {
                prefix: "images/360/cromwell/",
                suffix: ".webp"
            },
            detailedStats: {
                hullHealth: 930,
                turretHealth: 810,
                engineHealth: 440,
                trackHealth: 730,
                apDamage: 750,
                explosionDamage: 100,
                explosionRadius: 1000,
                reloadSpeed: 6.0,
                maxSpeed: 30,
                yawRate: 14.0,
                pitchRate: 6.0,
                pitchAngleMin: -12.0,
                pitchAngleMax: 20.0,
                gearSwitchTime: 0.7,
                maxShellsAP: 40,
                maxShellsHE: 35,
                fuelCost: 200
            }
         },
                                  {
             name: "Crusader Mk III",
             type: "Medium Tank",
             faction: "Great Britain",
            armor: "Front: 49mm, Sides: 28mm, Rear: 28mm",
            gun: "57mm QF 6-pounder",
            penetration: "Front: 81mm, Sides: 101mm",
            speed: "27 km/h",
            crew: "3",
            description: "Medium tank with good anti-tank capability and decent mobility.",
            weakSpots: "Sides, rear",
            strengths: "Good anti-tank gun, decent speed",
            icon: "fas fa-tank",
            has360View: true,
            images360: {
                prefix: "images/360/crusader-mk-iii/",
                suffix: ".webp"
            },
            detailedStats: {
                hullHealth: 910,
                turretHealth: 790,
                engineHealth: 420,
                trackHealth: 710,
                apDamage: 700,
                explosionDamage: 100,
                explosionRadius: 1000,
                reloadSpeed: 6.0,
                maxSpeed: 27,
                yawRate: 20.0,
                pitchRate: 6.5,
                pitchAngleMin: -12.0,
                pitchAngleMax: 30.0,
                gearSwitchTime: 0.9,
                maxShellsAP: 30,
                maxShellsHE: 35,
                fuelCost: 200
            }
         },
                                  {
             name: "Churchill Mk III",
             type: "Heavy Tank",
             faction: "Great Britain",
                         armor: "Front: 102mm, Sides: 76mm, Rear: 51mm",
             gun: "57mm QF 6-pounder",
             penetration: "Front: 81mm, Sides: 101mm",
            speed: "20 km/h",
             crew: "3",
            description: "Heavily armored infantry tank with excellent protection but slow speed.",
            weakSpots: "Sides, rear. This tank can be difficult to turn so be mindful of RPM's and how far you turn",
            strengths: "The side of this tank is nearly ALL tracks. This tank can be angled very effectively as the hull is very difficult to hit if you always angle at 90 degrees. Excellent armor, good for infantry support",
            icon: "fas fa-tank",
            has360View: true,
            images360: {
                prefix: "images/360/churchill-iii/",
                suffix: ".webp"
            },
            detailedStats: {
                hullHealth: 1230,
                turretHealth: 1080,
                engineHealth: 580,
                trackHealth: 960,
                apDamage: 750,
                explosionDamage: 100,
                explosionRadius: 1200,
                reloadSpeed: 8.0,
                maxSpeed: 20,
                yawRate: 12.0,
                pitchRate: 5.0,
                pitchAngleMin: -6.0,
                pitchAngleMax: 20.0,
                gearSwitchTime: 1.0,
                maxShellsAP: 30,
                maxShellsHE: 45,
                fuelCost: 600
            }
         },
                                  {
             name: "Churchill Mk.VII",
            type: "Heavy Tank",
            faction: "Great Britain",
            armor: "Front: 152mm, Sides: 95mm, Rear: 64mm",
            gun: "75mm QF Mk V",
            penetration: "Front: 91mm, Sides: 114mm",
            speed: "18 km/h",
            crew: "3",
            description: "Heavily armored infantry tank with thick frontal armor and improved protection.",
            weakSpots: "Sides, rear. This tank can be difficult to turn so be mindful of RPM's and how far you turn",
            strengths: "The side of this tank is nearly ALL tracks. This tank can be angled very effectively as the hull is very difficult to hit if you always angle at 90 degrees. Excellent frontal armor, good for infantry support",
            icon: "fas fa-tank",
            has360View: true,
            images360: {
                prefix: "images/360/churchill-vii/",
                suffix: ".webp"
            },
            detailedStats: {
                hullHealth: 1240,
                turretHealth: 1090,
                engineHealth: 620,
                trackHealth: 1030,
                apDamage: 800,
                explosionDamage: 100,
                explosionRadius: 1200,
                reloadSpeed: 8.0,
                maxSpeed: 18,
                yawRate: 10.0,
                pitchRate: 5.0,
                pitchAngleMin: -6.0,
                pitchAngleMax: 20.0,
                gearSwitchTime: 1.0,
                maxShellsAP: 40,
                maxShellsHE: 45,
                fuelCost: 600
            }
         },
                                  {
             name: "Sherman Firefly",
            type: "Heavy Tank",
             faction: "Great Britain",
                         armor: "Front: 63mm, Sides: 38mm, Rear: 38mm",
             gun: "76.2mm QF 17-pounder",
             penetration: "Front: 140mm, Sides: 175mm",
            speed: "22 km/h",
             crew: "3",
            description: "Sherman variant with powerful 17-pounder gun for anti-tank warfare.",
            weakSpots: "Sides, rear. This heavy tank has no hull turret as well as maneuverability is very poor. This tank actually uses an old M4 sherman driving model and should strictly be used to fight enemy heavy armor. Think of this as a tank destroyer nearly exclusively",
            strengths: "This is the only heavy tank in the game that has a 6 second reload. It is by far the fastest reloading tank in the game. Excellent anti-tank capability, good mobility",
            icon: "fas fa-tank",
            has360View: true,
            images360: {
                prefix: "images/360/sherman-firefly/",
                suffix: ".webp"
            },
            detailedStats: {
                hullHealth: 1200,
                turretHealth: 1020,
                engineHealth: 580,
                trackHealth: 960,
                apDamage: 850,
                explosionDamage: 100,
                explosionRadius: 1200,
                reloadSpeed: 8.0,
                maxSpeed: 22,
                yawRate: 10.0,
                pitchRate: 6.0,
                pitchAngleMin: -5.0,
                pitchAngleMax: 20.0,
                gearSwitchTime: 0.9,
                maxShellsAP: 40,
                maxShellsHE: 25,
                fuelCost: 600
            }
         },
         {
             name: "Churchill Mk III A.V.R.E.",
             type: "SPA (Self Propelled Artillery)",
             faction: "Great Britain",
             armor: "TBD",
             gun: "290mm Petard",
             penetration: "TBD",
             speed: "TBD",
             crew: "3",
             description: "Armoured Vehicle Royal Engineers variant of the Churchill tank.",
             weakSpots: "TBD",
             strengths: "TBD",
             icon: "fas fa-tank",
             has360View: true,
             images360: {
                 prefix: "images/360/Churchill SPA/",
                 suffix: ".webp"
             },
             detailedStats: {
                 hullHealth: null,
                 turretHealth: null,
                 engineHealth: null,
                 trackHealth: null,
                 apDamage: null,
                 explosionDamage: null,
                 explosionRadius: null,
                 reloadSpeed: null,
                 maxSpeed: null,
                 yawRate: null,
                 pitchRate: null,
                 pitchAngleMin: null,
                 pitchAngleMax: null,
                 gearSwitchTime: null,
                 maxShellsAP: null,
                 maxShellsHE: null,
                 fuelCost: null
             }
         },
         {
             name: "Bishop SP 25pdr",
             type: "SPA (Self Propelled Artillery)",
             faction: "Great Britain",
             armor: "TBD",
             gun: "25-pounder (87.6mm)",
             penetration: "TBD",
             speed: "TBD",
             crew: "3",
             description: "Self-propelled artillery mounting a 25-pounder field gun.",
             weakSpots: "TBD",
             strengths: "TBD",
             icon: "fas fa-tank",
             has360View: true,
             images360: {
                 prefix: "images/360/Bishop SPA/",
                 suffix: ".webp"
             },
             detailedStats: {
                 hullHealth: null,
                 turretHealth: null,
                 engineHealth: null,
                 trackHealth: null,
                 apDamage: null,
                 explosionDamage: null,
                 explosionRadius: null,
                 reloadSpeed: null,
                 maxSpeed: null,
                 yawRate: null,
                 pitchRate: null,
                 pitchAngleMin: null,
                 pitchAngleMax: null,
                 gearSwitchTime: null,
                 maxShellsAP: null,
                 maxShellsHE: null,
                 fuelCost: null
            }
         }
    ]
};

            // Penetration Data - Updated to match all tanks in Hell Let Loose
            const penetrationData = [
                // Heavy Tanks
                {
                    weapon: "88mm KwK 36 (Tiger I)",
                    tank: "Tiger I",
                    faction: "Germany",
                    type: "Heavy Tank",
                    range: "500m",
                    penetration: "165mm",
                    effectiveAgainst: "All tanks",
                    shotsToKill: "2 shots vs heavy, 1 shot vs below"
                },
                {
                    weapon: "75mm KwK 42 (Panther)",
                    tank: "Panther",
                    faction: "Germany",
                    type: "Heavy Tank",
                    range: "500m",
                    penetration: "149mm",
                    effectiveAgainst: "Heavy tank class and below",
                    shotsToKill: "2 shots vs heavy, 1 shot vs below"
                },
                {
                    weapon: "76mm M1A1 (Sherman 76 Jumbo)",
                    tank: "Sherman 76 Jumbo",
                    faction: "USA",
                    type: "Heavy Tank",
                    range: "500m",
                    penetration: "116mm",
                    effectiveAgainst: "Heavy tank class and below",
                    shotsToKill: "2 shots vs heavy, 1 shot vs below"
                },
                {
                    weapon: "75mm M3 (Sherman 75 Jumbo)",
                    tank: "Sherman 75 Jumbo",
                    faction: "USA",
                    type: "Heavy Tank",
                    range: "500m",
                    penetration: "76mm",
                    effectiveAgainst: "Medium tank class and below",
                    shotsToKill: "2 shots vs medium, 1 shot vs below"
                },
                {
                    weapon: "85mm D-5T (IS-1)",
                    tank: "IS-1",
                    faction: "Soviet Union",
                    type: "Heavy Tank",
                    range: "500m",
                    penetration: "102mm",
                    effectiveAgainst: "Heavy tank class and below",
                    shotsToKill: "2 shots vs heavy, 1 shot vs below"
                },
                {
                    weapon: "57mm QF 6-pounder (Churchill Mk III)",
                    tank: "Churchill Mk III",
                    faction: "Great Britain",
                    type: "Heavy Tank",
                    range: "500m",
                    penetration: "81mm",
                    effectiveAgainst: "Medium tank class and below",
                    shotsToKill: "1 shot vs medium and below"
                },
                
                // Medium Tanks
                {
                    weapon: "76.2mm QF 17-pounder (Sherman Firefly)",
                    tank: "Sherman Firefly",
                    faction: "Great Britain",
                    type: "Medium Tank",
                    range: "500m",
                    penetration: "140mm",
                    effectiveAgainst: "Heavy tank class and below",
                    shotsToKill: "1 shot vs heavy and below"
                },
                {
                    weapon: "75mm KwK 40 (Panzer IV)",
                    tank: "Panzer IV",
                    faction: "Germany",
                    type: "Medium Tank",
                    range: "500m",
                    penetration: "98mm",
                    effectiveAgainst: "Medium tank class and below",
                    shotsToKill: "2 shots vs medium, 1 shot vs below"
                },
                {
                    weapon: "75mm M3 (M4 Sherman)",
                    tank: "M4 Sherman",
                    faction: "USA",
                    type: "Medium Tank",
                    range: "500m",
                    penetration: "76mm",
                    effectiveAgainst: "Medium tank class and below",
                    shotsToKill: "2 shots vs medium, 1 shot vs below"
                },
                {
                    weapon: "76.2mm F-34 (T-34)",
                    tank: "T-34",
                    faction: "Soviet Union",
                    type: "Medium Tank",
                    range: "500m",
                    penetration: "76mm",
                    effectiveAgainst: "Medium tank class and below",
                    shotsToKill: "2 shots vs medium, 1 shot vs below"
                },
                {
                    weapon: "75mm QF Mk V (Cromwell)",
                    tank: "Cromwell",
                    faction: "Great Britain",
                    type: "Medium Tank",
                    range: "500m",
                    penetration: "91mm",
                    effectiveAgainst: "Medium tank class and below",
                    shotsToKill: "2 shots vs medium, 1 shot vs below"
                },
                {
                    weapon: "57mm QF 6-pounder (Crusader Mk III)",
                    tank: "Crusader Mk III",
                    faction: "Great Britain",
                    type: "Medium Tank",
                    range: "500m",
                    penetration: "81mm",
                    effectiveAgainst: "Medium tank class and below",
                    shotsToKill: "2 shots vs medium, 1 shot vs below"
                },
                
                // Light Tanks
                {
                    weapon: "37mm M6 (M5A1 Stuart)",
                    tank: "M5A1 Stuart",
                    faction: "USA",
                    type: "Light Tank",
                    range: "500m",
                    penetration: "61mm",
                    effectiveAgainst: "Light tank class and below",
                    shotsToKill: "2 shots vs light, 1 shot vs below"
                },
                
                // Recon Vehicles
                {
                    weapon: "37mm M6 (Greyhound)",
                    tank: "Greyhound",
                    faction: "USA",
                    type: "Recon Vehicle",
                    range: "500m",
                    penetration: "61mm",
                    effectiveAgainst: "Recon vehicles only",
                    shotsToKill: "1 shot vs recon vehicles"
                },
                {
                    weapon: "50mm KwK 39 (Puma)",
                    tank: "Puma",
                    faction: "Germany",
                    type: "Recon Vehicle",
                    range: "500m",
                    penetration: "67mm",
                    effectiveAgainst: "Recon vehicles only",
                    shotsToKill: "1 shot vs recon vehicles"
                },
                {
        weapon: "20mm KwK 30 (Luchs)",
        tank: "Luchs",
                    faction: "Germany",
                    type: "Light Tank",
                    range: "500m",
                    penetration: "23mm",
                    effectiveAgainst: "Infantry, light vehicles",
                    shotsToKill: "1 shot vs infantry/vehicles"
                },
                {
                    weapon: "45mm 20-K (T-70)",
                    tank: "T-70",
                    faction: "Soviet Union",
                    type: "Light Tank",
                    range: "500m",
                    penetration: "51mm",
                    effectiveAgainst: "Light tanks and below",
                    shotsToKill: "1 shot vs light tanks and below"
                },
                {
                    weapon: "45mm 20-K (BA-10 Scout Car)",
                    tank: "BA-10 Scout Car",
                    faction: "Soviet Union",
                    type: "Recon Vehicle",
                    range: "500m",
                    penetration: "51mm",
                    effectiveAgainst: "Recon vehicles only",
                    shotsToKill: "1 shot vs recon vehicles"
                },
                {
                    weapon: "40mm QF 2-pounder (Daimler)",
                    tank: "Daimler",
                    faction: "Great Britain",
                    type: "Recon Vehicle",
                    range: "500m",
                    penetration: "57mm",
                    effectiveAgainst: "Recon vehicles only",
                    shotsToKill: "1 shot vs recon vehicles"
                },
                {
                    weapon: "37mm M6 (M3 Stuart 'Honey')",
                    tank: "M3 Stuart 'Honey'",
                    faction: "Great Britain",
                    type: "Light Tank",
                    range: "500m",
                    penetration: "61mm",
                    effectiveAgainst: "Light tanks and below",
                    shotsToKill: "1 shot vs light tanks and below"
                },
                {
                    weapon: "40mm QF 2-pounder (Tetrarch)",
                    tank: "Tetrarch",
                    faction: "Great Britain",
                    type: "Light Tank",
                    range: "500m",
                    penetration: "57mm",
                    effectiveAgainst: "Light tanks and below",
                    shotsToKill: "1 shot vs light tanks and below"
                }
            ];

// DOM Elements
const themeSelect = document.getElementById('themeSelect');
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('.section');

// Comparison Elements
const compareToggle = document.getElementById('compareToggle');
const comparisonPanel = document.getElementById('comparisonPanel');
const closeComparison = document.getElementById('closeComparison');
const clearComparison = document.getElementById('clearComparison');

// Comparison state
let comparisonMode = false;
const factionBtns = document.querySelectorAll('[data-faction]');
const tankTypeBtns = document.querySelectorAll('[data-tank-type]');
const filterToggle = document.getElementById('filterToggle');
const filterDropdown = document.getElementById('filterDropdown');
const tankGrid = document.getElementById('tankGrid');
const penetrationTableBody = document.getElementById('penetrationTableBody');

const practiceTankImage = document.getElementById('practiceTankImage');
const practiceOptions = document.getElementById('practiceOptions');

// Filter state
let currentFaction = 'all';
let currentTankType = 'all';

// Theme Management
let currentTheme = localStorage.getItem('theme') || 'theme-default';

// Calculate Easter Sunday for a given year (using the computus algorithm)
function calculateEaster(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
}

// Get the appropriate holiday theme based on current date
function getHolidayTheme() {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const day = now.getDate();
    const year = now.getFullYear();
    
    // New Year's (December 31 and January 1)
    if ((month === 12 && day === 31) || (month === 1 && day === 1)) {
        return 'theme-newyear';
    }
    
    // Valentine's Day (February 14)
    if (month === 2 && day === 14) {
        return 'theme-valentines';
    }
    
    // St. Patrick's Day (March 17)
    if (month === 3 && day === 17) {
        return 'theme-stpatricks';
    }
    
    // Easter (calculated dynamically)
    const easter = calculateEaster(year);
    const easterMonth = easter.getMonth() + 1;
    const easterDay = easter.getDate();
    // Check if within 7 days of Easter (Easter week)
    const daysDiff = Math.abs((now - easter) / (1000 * 60 * 60 * 24));
    if (month === easterMonth && daysDiff <= 7) {
        return 'theme-easter';
    }
    
    // July 4th
    if (month === 7 && day === 4) {
        return 'theme-july4';
    }
    
    // Halloween (October 31)
    if (month === 10 && day === 31) {
        return 'theme-halloween';
    }
    
    // Thanksgiving (Entire month of November, ending the day after Thanksgiving)
    if (month === 11) {
        const firstOfMonth = new Date(year, 10, 1);
        const dayOfWeek = firstOfMonth.getDay();
        // Calculate first Thursday: if Nov 1 is Thu (4), it's day 1; if Fri (5), day 7; if Sat (6), day 6; if Sun (0), day 5; if Mon (1), day 4; if Tue (2), day 3; if Wed (3), day 2
        let firstThursday;
        if (dayOfWeek === 0) { // Sunday
            firstThursday = 5;
        } else if (dayOfWeek <= 4) { // Monday-Thursday
            firstThursday = 5 - dayOfWeek;
        } else { // Friday-Saturday
            firstThursday = 12 - dayOfWeek;
        }
        const thanksgivingDate = firstThursday + 21; // 4th Thursday
        const dayAfterThanksgiving = thanksgivingDate + 1;
        
        // If it's November and before or on the day after Thanksgiving, show Thanksgiving theme
        if (day <= dayAfterThanksgiving) {
            return 'theme-thanksgiving';
        }
    }
    
    // Veterans Day (November 11)
    if (month === 11 && day === 11) {
        return 'theme-veterans';
    }
    
    // Christmas (December 1-31)
    if (month === 12) {
        return 'theme-christmas';
    }
    
    // Default theme if no holiday matches
    return 'theme-default';
}

function setTheme(theme) {
    document.body.className = theme;
    currentTheme = theme;
    localStorage.setItem('theme', theme);
    
    // Update dropdown: show actual theme for manual selections, but "Default" for auto-holiday themes
    if (themeSelect) {
        // Check if this is a holiday theme
        const holidayThemes = ['theme-christmas', 'theme-newyear', 'theme-valentines', 'theme-stpatricks', 
                              'theme-easter', 'theme-july4', 'theme-halloween', 'theme-thanksgiving', 'theme-veterans'];
        
        if (holidayThemes.includes(theme)) {
            // Holiday theme active - show "Default" in dropdown
            themeSelect.value = 'theme-default';
        } else {
            // Regular theme - show the actual theme name
            themeSelect.value = theme;
        }
    }
    
    // Show/hide Halloween ghost
    const ghost = document.getElementById('halloweenGhost');
    if (ghost) {
        if (theme === 'theme-halloween') {
            ghost.style.display = 'block';
        } else {
            ghost.style.display = 'none';
        }
    }
    
    // Show/hide Valentine's Day hearts
    const hearts = document.getElementById('valentineHearts');
    if (hearts) {
        if (theme === 'theme-valentines') {
            hearts.style.display = 'block';
        } else {
            hearts.style.display = 'none';
        }
    }
    
    // Show/hide St. Patrick's Day gold and clovers
    const stpatricks = document.getElementById('stpatricksElements');
    if (stpatricks) {
        if (theme === 'theme-stpatricks') {
            stpatricks.style.display = 'block';
        } else {
            stpatricks.style.display = 'none';
        }
    }
    
    // Show/hide Thanksgiving leaves and turkeys
    const thanksgiving = document.getElementById('thanksgivingElements');
    if (thanksgiving) {
        if (theme === 'theme-thanksgiving') {
            thanksgiving.style.display = 'block';
        } else {
            thanksgiving.style.display = 'none';
        }
    }
}

// Initialize theme - always check for automatic holiday theme
document.addEventListener('DOMContentLoaded', function() {
    const savedTheme = localStorage.getItem('theme');
    const manualOverride = localStorage.getItem('manualThemeOverride') === 'true';
    
    // Check for holiday theme
    const holidayTheme = getHolidayTheme();
    
    // If user manually selected "Default", don't auto-apply holidays
    if (manualOverride && savedTheme === 'theme-default') {
        setTheme('theme-default');
    } else if (holidayTheme !== 'theme-default') {
        // Holiday is active, always apply it (replaces any saved theme)
        setTheme(holidayTheme);
    } else if (savedTheme && savedTheme !== 'theme-default') {
        // No holiday active, use saved theme (if it's not default)
        setTheme(savedTheme);
    } else {
        // No holiday active, use default theme
        setTheme('theme-default');
    }
    
});

// Theme dropdown event - direct theme selection
themeSelect.addEventListener('change', (e) => {
    const selectedTheme = e.target.value;
    
    // If user selects "Default", mark as manual override to prevent auto-holiday
    if (selectedTheme === 'theme-default') {
        localStorage.setItem('manualThemeOverride', 'true');
        setTheme('theme-default');
    } else {
        // For other themes, clear the manual override flag so holidays can still activate
        localStorage.setItem('manualThemeOverride', 'false');
        setTheme(selectedTheme);
    }
    // The setTheme function will update the dropdown appropriately
});

// Periodically check for holiday themes (in case date changes while page is open)
setInterval(function() {
    const manualOverride = localStorage.getItem('manualThemeOverride') === 'true';
    const savedTheme = localStorage.getItem('theme');
    
    // Only auto-apply holidays if user hasn't manually selected "Default"
    if (!(manualOverride && savedTheme === 'theme-default')) {
        const holidayTheme = getHolidayTheme();
        const currentTheme = document.body.className;
        
        // If a holiday is active and it's not currently applied, apply it
        if (holidayTheme !== 'theme-default' && currentTheme !== holidayTheme) {
            setTheme(holidayTheme);
        }
        // If no holiday is active and we're on a holiday theme, go back to saved/default
        else if (holidayTheme === 'theme-default' && 
                 ['theme-christmas', 'theme-newyear', 'theme-valentines', 'theme-stpatricks', 
                  'theme-easter', 'theme-july4', 'theme-halloween', 'theme-thanksgiving', 'theme-veterans'].includes(currentTheme)) {
            // Holiday period ended, restore saved theme or default
            if (savedTheme && savedTheme !== 'theme-default') {
                setTheme(savedTheme);
            } else {
                setTheme('theme-default');
            }
        }
    }
}, 60000); // Check every minute

// Force apply holiday theme (for testing/debugging)
// This will override any manual selection and apply the current holiday
function forceApplyHolidayTheme() {
    const holidayTheme = getHolidayTheme();
    if (holidayTheme !== 'theme-default') {
        localStorage.setItem('manualThemeOverride', 'false');
        setTheme(holidayTheme);
    }
}


// Navigation Management
function showSection(sectionId, updateHash = true) {
    // Prevent navigation when in fullscreen mode (except when exiting fullscreen)
    if (document.body.classList.contains('fullscreen-mode') && sectionId !== 'ranging') {
        return; // Block navigation to other sections when in fullscreen
    }

    // Close scope viewer if it's open
    const scopeViewer = document.getElementById('scopeViewer');
    if (scopeViewer && scopeViewer.classList.contains('active')) {
        closeScopeView();
    }

    // Close all expanded tiles when navigating to a different section
    closeAllExpandedTiles();
    
    // Hide all sections
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav links
    navLinks.forEach(link => {
        link.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Add active class to clicked nav link
    const activeLink = document.querySelector(`[href="#${sectionId}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    // Update URL hash if requested
    if (updateHash) {
        window.location.hash = sectionId;
    }

    // Scroll to top when showing overview section (unless it's a hash route)
    if (sectionId === 'overview' && updateHash) {
        window.scrollTo({top: 0, behavior: 'smooth'});
    }
    
    // Initialize practice tanks when identification section is shown
    if (sectionId === 'identification') {
        initializePracticeTanks();
        // Set initial home image based on current difficulty
        updateHomeImage(currentDifficulty);
    }
    
    // Initialize armor sights when ranging section is shown
    if (sectionId === 'ranging') {
        initializeArmorSights();
    }
    
    // Scroll to top of the page
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
    
    if (sectionId === 'overview') {
    }
}

// Navigation event listeners
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = link.getAttribute('href').substring(1);
        showSection(sectionId);
    });
});

// Logo link event listener
const logoLink = document.querySelector('.logo-link');
if (logoLink) {
    logoLink.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('overview');
    });
}

// Tank Display Functions
function create360Viewer(tank) {
    // Use a more robust tank ID generation that handles special characters better
    const tankId = tank.name.toLowerCase()
        .replace(/['"]/g, '') // Remove quotes
        .replace(/[^a-zA-Z0-9\s]/g, '') // Remove other special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    
    const images360 = tank.images360;
    
    return `
        <div class="tank-360-viewer" data-tank-id="${tankId}">
            <div class="tank-360-container" 
                 onmousedown="startDrag(event, '${tankId}')" 
                 onmousemove="drag(event, '${tankId}')" 
                 onmouseup="endDrag(event, '${tankId}')" 
                 onmouseleave="endDrag(event, '${tankId}')"
                 ontouchstart="startTouchDrag(event, '${tankId}')"
                 ontouchmove="touchDrag(event, '${tankId}')"
                 ontouchend="endTouchDrag(event, '${tankId}')"
                 style="cursor: grab;">
                <img src="${images360.prefix}1${images360.suffix}?v=${buildVersion}" 
                     alt="${tank.name} - 360° View" 
                     class="tank-360-image" 
                     loading="lazy" 
                     data-current-angle="45"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="tank-360-fallback" style="display: none; align-items: center; justify-content: center; height: 100%; color: var(--text-secondary); font-style: italic;">
                    <i class="${tank.icon}" style="font-size: 3rem; margin-right: 1rem;"></i>
                    <span>360° View Not Available</span>
                </div>
                <div class="tank-360-indicator">
                    <span class="tank-360-angle">45°</span>
                </div>
            </div>
            <div class="tank-360-controls">
                <button class="tank-360-btn tank-360-left" onclick="rotateTank('${tankId}', -1)">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <button class="tank-360-btn tank-360-right" onclick="rotateTank('${tankId}', 1)">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        </div>
    `;
}

// Function to rotate the tank 360 view
function rotateTank(tankId, direction) {
    // Find the 360 viewer directly by its data-tank-id
    const viewer = document.querySelector(`.tank-360-viewer[data-tank-id="${tankId}"]`);
    if (!viewer) {
        return;
    }
    
    const image = viewer.querySelector('.tank-360-image');
    const angleIndicator = viewer.querySelector('.tank-360-angle');
    
    if (!image || !angleIndicator) {
        return;
    }
    
    // Get current image number from the image src or data attribute
    // Extract current image number from src attribute
    let currentImageNumber = 1; // Default to image 1 (45°)
    const currentSrc = image.src;
    const match = currentSrc.match(/(\d+)(\.webp|\.png)/);
    if (match) {
        currentImageNumber = parseInt(match[1]);
    } else {
        // Fallback: get from angle
        const currentAngle = parseInt(image.getAttribute('data-current-angle')) || 45;
        currentImageNumber = Math.floor(currentAngle / 45);
    }
    
    // Calculate new image number
    let imageNumber = currentImageNumber + direction;
    
    // Handle wrap-around
    if (imageNumber < 0) {
        imageNumber = 7; // Wrap to last image (315°)
    } else if (imageNumber > 7) {
        imageNumber = 0; // Wrap to first image (0°)
    }
    
    // Calculate angle from image number
    const angle = imageNumber * 45;
    
    // Get tank data to construct image path
    const tankName = viewer.closest('.tank-card').querySelector('.tank-name').textContent;
    
    // Find tank in database
    let tankData = null;
    Object.values(tankDatabase).forEach(factionTanks => {
        const found = factionTanks.find(tank => tank.name === tankName);
        if (found) tankData = found;
    });
    
    if (tankData && tankData.images360) {
        const newImagePath = `${tankData.images360.prefix}${imageNumber}${tankData.images360.suffix}?v=${buildVersion}`;
        
        // Update angle indicator and data attribute
        image.setAttribute('data-current-angle', angle);
        angleIndicator.textContent = `${angle}°`;
        
        // Load new image
            image.src = newImagePath;
    }
}

// Function to rotate tank by angle (for drag functionality)
function rotateTankByAngle(tankId, targetAngle, showSnapping = true) {
    const viewer = document.querySelector(`.tank-360-viewer[data-tank-id="${tankId}"]`);
    if (!viewer) return;
    
    const image = viewer.querySelector('.tank-360-image');
    const angleIndicator = viewer.querySelector('.tank-360-angle');
    
    if (!image || !angleIndicator) return;
    
    // Normalize target angle to handle continuous rotation beyond 360°
    let normalizedAngle = targetAngle;
    while (normalizedAngle < 0) normalizedAngle += 360;
    while (normalizedAngle >= 360) normalizedAngle -= 360;
    
    // Snap to nearest valid angle (8 positions: 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°)
    const validAngles = [0, 45, 90, 135, 180, 225, 270, 315];
    let snappedAngle = validAngles[0];
    let minDifference = Math.abs(normalizedAngle - validAngles[0]);
    
    for (let angle of validAngles) {
        const difference = Math.abs(normalizedAngle - angle);
        if (difference < minDifference) {
            minDifference = difference;
            snappedAngle = angle;
        }
    }
    
    // Calculate image number (0-7) directly from angle - images are 0-indexed
    // Mapping: 0°=0, 45°=1, 90°=2, 135°=3, 180°=4, 225°=5, 270°=6, 315°=7
    // Since we have 8 images at 45° intervals, image number = angle / 45
    let imageNumber = Math.floor(snappedAngle / 45);
    
    // Ensure image number is in valid range (0-7) with proper wrap-around
    if (imageNumber < 0) {
        imageNumber = 7;
        snappedAngle = 315; // Set angle to match image 7
    }
    if (imageNumber >= 8) {
        imageNumber = 0;
        snappedAngle = 0; // Set angle to match image 0
    }
    
    // Ensure angle is exactly correct for the image number (fix any rounding issues)
    // This ensures image 0 = 0°, image 1 = 45°, etc.
    snappedAngle = imageNumber * 45;
    
    // Get tank data to construct image path
    const tankName = viewer.closest('.tank-card').querySelector('.tank-name').textContent;
    
    // Find tank in database
    let tankData = null;
    Object.values(tankDatabase).forEach(factionTanks => {
        const found = factionTanks.find(tank => tank.name === tankName);
        if (found) tankData = found;
    });
    
    if (tankData && tankData.images360) {
        const newImagePath = `${tankData.images360.prefix}${imageNumber}${tankData.images360.suffix}?v=${buildVersion}`;
        
        // Always update the angle indicator and data attribute first
        image.setAttribute('data-current-angle', snappedAngle);
        angleIndicator.textContent = `${snappedAngle}°`;
        
        // Add error handling for image loading
        const tempImage = new Image();
        tempImage.onload = function () {
            // Image loaded successfully, update the display
            image.src = newImagePath;
            
            // Only show snapping effect if requested (not during drag)
            if (showSnapping) {
                const container = viewer.querySelector('.tank-360-container');
                if (container) {
                    container.classList.add('snapping');
                    setTimeout(() => {
                        container.classList.remove('snapping');
                    }, 150);
                }
            }
        };
        tempImage.onerror = function () {
            // Image failed to load - log for debugging but don't revert angle
            console.warn(`Failed to load 360 image: ${newImagePath}`);
        };
        tempImage.src = newImagePath;
    }
}

// Drag functionality variables
let isDragging = false;
let dragStartX = 0;
let dragStartAngle = 0;
let currentDragTankId = null;

// Start drag operation
function startDrag(event, tankId) {
    event.preventDefault();
    isDragging = true;
    dragStartX = event.clientX;
    currentDragTankId = tankId;
    
    // Get current angle
    const viewer = document.querySelector(`.tank-360-viewer[data-tank-id="${tankId}"]`);
    if (viewer) {
        const image = viewer.querySelector('.tank-360-image');
        dragStartAngle = parseInt(image.getAttribute('data-current-angle')) || 45;
    }
    
    // Change cursor
    event.target.style.cursor = 'grabbing';
}

// Handle drag movement
function drag(event, tankId) {
    if (!isDragging || currentDragTankId !== tankId) return;
    
    event.preventDefault();
    
    const deltaX = event.clientX - dragStartX;
    const sensitivity = 2; // Pixels per degree
    const deltaAngle = (deltaX / sensitivity);
    
    const newAngle = dragStartAngle + deltaAngle;
    rotateTankByAngle(tankId, newAngle, false); // Don't show snapping during drag
}

// End drag operation
function endDrag(event, tankId) {
    if (!isDragging || currentDragTankId !== tankId) return;
    
    isDragging = false;
    currentDragTankId = null;
    
    // Reset cursor
    if (event.target) {
        event.target.style.cursor = 'grab';
    }
    
    // Show snapping effect when drag ends
    const viewer = document.querySelector(`.tank-360-viewer[data-tank-id="${tankId}"]`);
    if (viewer) {
        const container = viewer.querySelector('.tank-360-container');
        if (container) {
            container.classList.add('snapping');
            setTimeout(() => {
                container.classList.remove('snapping');
            }, 150);
        }
    }
}

// Touch drag functionality
function startTouchDrag(event, tankId) {
    event.preventDefault();
    if (event.touches.length === 1) {
        isDragging = true;
        dragStartX = event.touches[0].clientX;
        currentDragTankId = tankId;
        
        // Get current angle
        const viewer = document.querySelector(`.tank-360-viewer[data-tank-id="${tankId}"]`);
        if (viewer) {
            const image = viewer.querySelector('.tank-360-image');
            dragStartAngle = parseInt(image.getAttribute('data-current-angle')) || 45;
        }
    }
}

function touchDrag(event, tankId) {
    if (!isDragging || currentDragTankId !== tankId || event.touches.length !== 1) return;
    
    event.preventDefault();
    
    const deltaX = event.touches[0].clientX - dragStartX;
    const sensitivity = 2; // Pixels per degree
    const deltaAngle = (deltaX / sensitivity);
    
    const newAngle = dragStartAngle + deltaAngle;
    rotateTankByAngle(tankId, newAngle, false); // Don't show snapping during touch drag
}

function endTouchDrag(event, tankId) {
    if (!isDragging || currentDragTankId !== tankId) return;
    
    isDragging = false;
    currentDragTankId = null;
    
    // Show snapping effect when touch drag ends
    const viewer = document.querySelector(`.tank-360-viewer[data-tank-id="${tankId}"]`);
    if (viewer) {
        const container = viewer.querySelector('.tank-360-container');
        if (container) {
            container.classList.add('snapping');
            setTimeout(() => {
                container.classList.remove('snapping');
            }, 150);
        }
    }
}

function createTankCard(tank) {
    const has360View = tank.has360View || false;
    const viewerContent = has360View ? create360Viewer(tank) : `<i class="${tank.icon}"></i>`;
    
    return `
        <div class="tank-card" data-tank-id="${tank.name.replace(/\s+/g, '-').toLowerCase()}">
            <div class="tank-image bg-${globalBackground}">
                <div class="background-selector">
                    <button class="bg-btn ${globalBackground === 'grass' ? 'active' : ''}" data-background="grass" title="Grass Background">
                        <i class="fas fa-seedling"></i>
                    </button>
                    <button class="bg-btn ${globalBackground === 'snow' ? 'active' : ''}" data-background="snow" title="Snow Background">
                        <i class="fas fa-snowflake"></i>
                    </button>
                    <button class="bg-btn ${globalBackground === 'desert' ? 'active' : ''}" data-background="desert" title="Desert Background">
                        <i class="fas fa-sun"></i>
                    </button>
                </div>
                ${viewerContent}
            </div>
            <div class="tank-info">
                <button class="tank-expand-btn" title="Expand Details">
                    <i class="fas fa-plus"></i>
                </button>
                <h3 class="tank-name">${tank.name}</h3>
                <span class="tank-faction">${tank.faction}</span>
                ${has360View ? '<span class="tank-360-badge">360° View</span>' : ''}
                <div class="tank-stats">
                    <div class="stat">
                        <div class="stat-label">Type</div>
                        <div class="stat-value">${tank.type}</div>
                    </div>
                    <div class="stat">
                        <div class="stat-label">Crew</div>
                        <div class="stat-value">${tank.crew}</div>
                    </div>
                    <div class="stat">
                        <div class="stat-label">Speed</div>
                        <div class="stat-value">${tank.speed}</div>
                    </div>
                    <div class="stat">
                        <div class="stat-label">Gun</div>
                        <div class="stat-value">${tank.gun}</div>
                    </div>
                </div>
                <p class="tank-description">${tank.description}</p>
            </div>
            <div class="tank-details">

                <div class="tank-details-header">
                    <h2>Figure ${getTankFigureNumber(tank)}: 'The ${tank.name}'</h2>
                </div>
                <div class="tank-details-content">
                    <div class="tank-stats-section">
                        <h3>Combat Statistics</h3>
                        <p>Comprehensive stats from the latest game data:</p>
                        <div class="stats-grid-compact">
                            <div class="stat-group">
                                <h4><i class="fas fa-shield-alt"></i> Health & Armor</h4>
                                <div class="stat-pair">
                                    <span class="stat-label">Hull Health:</span>
                                    <span class="stat-value">${tank.detailedStats ? tank.detailedStats.hullHealth : 'N/A'}</span>
                    </div>
                                <div class="stat-pair">
                                    <span class="stat-label">Turret Health:</span>
                                    <span class="stat-value">${tank.detailedStats ? tank.detailedStats.turretHealth : 'N/A'}</span>
                    </div>
                                <div class="stat-pair">
                                    <span class="stat-label">Engine Health:</span>
                                    <span class="stat-value">${tank.detailedStats ? tank.detailedStats.engineHealth : 'N/A'}</span>
                </div>
                                <div class="stat-pair">
                                    <span class="stat-label">Track Health:</span>
                                    <span class="stat-value">${tank.detailedStats ? tank.detailedStats.trackHealth : 'N/A'}</span>
                                </div>
                            </div>
                            <div class="stat-group">
                                <h4><i class="fas fa-crosshairs"></i> Firepower</h4>
                                <div class="stat-pair">
                                    <span class="stat-label">AP Damage:</span>
                                    <span class="stat-value">${tank.detailedStats ? tank.detailedStats.apDamage : 'N/A'}</span>
                                </div>
                                <div class="stat-pair">
                                    <span class="stat-label">Reload Speed:</span>
                                    <span class="stat-value">${tank.detailedStats ? tank.detailedStats.reloadSpeed + 's' : 'N/A'}</span>
                                </div>
                                <div class="stat-pair">
                                    <span class="stat-label">Max AP Shells:</span>
                                    <span class="stat-value">${tank.detailedStats ? tank.detailedStats.maxShellsAP : 'N/A'}</span>
                                </div>
                                <div class="stat-pair">
                                    <span class="stat-label">Max HE Shells:</span>
                                    <span class="stat-value">${tank.detailedStats ? tank.detailedStats.maxShellsHE : 'N/A'}</span>
                                </div>
                            </div>
                            <div class="stat-group">
                                <h4><i class="fas fa-tachometer-alt"></i> Mobility</h4>
                                <div class="stat-pair">
                                    <span class="stat-label">Max Speed:</span>
                                    <span class="stat-value">${tank.detailedStats ? tank.detailedStats.maxSpeed + ' km/h' : tank.speed}</span>
                                </div>
                                <div class="stat-pair">
                                    <span class="stat-label">Yaw Rate:</span>
                                    <span class="stat-value">${tank.detailedStats ? tank.detailedStats.yawRate + '°/s' : 'N/A'}</span>
                                </div>
                                <div class="stat-pair">
                                    <span class="stat-label">Pitch Rate:</span>
                                    <span class="stat-value">${tank.detailedStats ? tank.detailedStats.pitchRate + '°/s' : 'N/A'}</span>
                                </div>
                                <div class="stat-pair">
                                    <span class="stat-label">Gear Switch:</span>
                                    <span class="stat-value">${tank.detailedStats ? tank.detailedStats.gearSwitchTime + 's' : 'N/A'}</span>
                                </div>
                            </div>
                            <div class="stat-group">
                                <h4><i class="fas fa-bullseye"></i> Turret & Utility</h4>
                                <div class="stat-pair">
                                    <span class="stat-label">Pitch Range:</span>
                                    <span class="stat-value">${tank.detailedStats ? tank.detailedStats.pitchAngleMin + '° to ' + tank.detailedStats.pitchAngleMax + '°' : 'N/A'}</span>
                                </div>
                                <div class="stat-pair">
                                    <span class="stat-label">Explosion Damage (when destroyed):</span>
                                    <span class="stat-value">${tank.detailedStats ? tank.detailedStats.explosionDamage : 'N/A'}</span>
                                </div>
                                <div class="stat-pair">
                                    <span class="stat-label">Explosion Radius (when destroyed):</span>
                                    <span class="stat-value">${tank.detailedStats ? tank.detailedStats.explosionRadius + 'cm' : 'N/A'}</span>
                                </div>
                                <div class="stat-pair">
                                    <span class="stat-label">Fuel Cost:</span>
                                    <span class="stat-value">${tank.detailedStats ? tank.detailedStats.fuelCost : 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="tank-performance-section">
                        <h3>Combat Analysis</h3>
                        <p><strong>Strengths:</strong> ${tank.strengths}</p>
                        <p><strong>Weak Spots:</strong> ${tank.weakSpots}</p>
                        <p><strong>Description:</strong> ${tank.description}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function displayTanks(faction = 'all', tankType = 'all') {
    let tanksToShow = [];
    
    // Get tanks based on faction filter
    if (faction === 'all') {
        Object.values(tankDatabase).forEach(factionTanks => {
            tanksToShow = tanksToShow.concat(factionTanks);
        });
    } else {
        tanksToShow = tankDatabase[faction] || [];
    }
    
    // Apply tank type filter
    if (tankType !== 'all') {
        // Map short filter names to full tank type names
        const tankTypeMap = {
            'heavy': 'Heavy Tank',
            'medium': 'Medium Tank',
            'light': 'Light Tank',
            'recon': 'Recon Vehicle',
            'spa': 'SPA (Self Propelled Artillery)'
        };
        
        const fullTankType = tankTypeMap[tankType] || tankType;
        tanksToShow = tanksToShow.filter(tank => tank.type === fullTankType);
    }
    
    // Sort tanks by type: Heavy -> Medium -> Light -> Recon -> SPA
    const typeOrder = {
        'Heavy Tank': 0,
        'Medium Tank': 1,
        'Light Tank': 2,
        'Recon Vehicle': 3,
        'SPA (Self Propelled Artillery)': 4
    };
    
    tanksToShow.sort((a, b) => {
        return typeOrder[a.type] - typeOrder[b.type];
    });
    
    tankGrid.innerHTML = tanksToShow.map(tank => createTankCard(tank)).join('');
    
    // Add click event listeners to expand buttons
    const expandButtons = document.querySelectorAll('.tank-expand-btn');
    expandButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = button.closest('.tank-card');
            expandTankCard(card);
        });
    });

    // Restore comparison buttons if comparison mode is active
    if (comparisonMode) {
        showCompareButtons();
        // Ensure comparison panel is visible if tanks are selected
        if (selectedTank1 || selectedTank2) {
            comparisonPanel.style.display = 'block';
        }
    }
}

// Tank expansion functionality
function expandTankCard(card) {
    // Close any other expanded cards
    const expandedCards = document.querySelectorAll('.tank-card.expanded');
    expandedCards.forEach(expandedCard => {
        if (expandedCard !== card) {
            expandedCard.classList.remove('expanded');
            const otherButton = expandedCard.querySelector('.tank-expand-btn');
            if (otherButton) {
                otherButton.classList.remove('expanded');
                otherButton.innerHTML = '<i class="fas fa-plus"></i>';
            }
        }
    });
    
    // Toggle current card
    const isExpanding = !card.classList.contains('expanded');
    card.classList.toggle('expanded');
    
    // Update button state
    const button = card.querySelector('.tank-expand-btn');
    if (button) {
        button.classList.toggle('expanded');
        if (isExpanding) {
            button.innerHTML = '<i class="fas fa-times"></i>';
            button.title = 'Collapse Details';

            // Update URL hash with tank name
            const tankName = card.querySelector('.tank-name');
            if (tankName) {
                const tankNameSlug = tankName.textContent.toLowerCase().replace(/\s+/g, '-');
                isUpdatingHash = true;
                window.location.hash = `tanks/${tankNameSlug}`;
            }
        } else {
            button.innerHTML = '<i class="fas fa-plus"></i>';
            button.title = 'Expand Details';
            // Reset hash to just tanks section
            isUpdatingHash = true;
            window.location.hash = 'tanks';
            // Scroll back to top when collapsing
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    }
    
    // Scroll to expanded card
    if (isExpanding) {
        card.scrollIntoView({behavior: 'smooth', block: 'start'});
    }
}

// Helper functions for detailed tank information
function getTankFigureNumber(tank) {
    const allTanks = Object.values(tankDatabase).flat();
    const index = allTanks.findIndex(t => t.name === tank.name);
    return index + 1;
}

function getTurretTraverseTime(tank) {
    const traverseTimes = {
        'M4 Sherman': '12s',
        'Sherman 75 Jumbo': '13s',
        'Sherman 76 Jumbo': '13s',
        'M5A1 Stuart': '8s',
        'Greyhound': '6s',
        'Panzer IV': '12s',
        'Panther': '14s',
        'Tiger I': '16s',
        'Luchs': '6s',
        'Puma': '5s',
        'T-34': '10s',
        'IS-1': '17s',
        'T-70': '7s',
        'BA-10 Scout Car': '6s',
        'Daimler': '5s',
        'M3 Stuart \'Honey\'': '8s',
        'Tetrarch': '7s',
        'Cromwell': '11s',
        'Crusader Mk III': '10s',
        'Churchill Mk III': '16s',
        'Sherman Firefly': '12s'
    };
    return traverseTimes[tank.name] || '12s';
}

function getReloadSpeed(tank) {
    const reloadSpeeds = {
        'M4 Sherman': '6s',
        'Sherman 75 Jumbo': '6s',
        'Sherman 76 Jumbo': '7s',
        'M5A1 Stuart': '4s',
        'Greyhound': '4s',
        'Panzer IV': '6s',
        'Panther': '7s',
        'Tiger I': '8s',
        'Luchs': '3s',
        'Puma': '4s',
        'T-34': '6s',
        'IS-1': '8s',
        'T-70': '4s',
        'BA-10 Scout Car': '4s',
        'Daimler': '4s',
        'M3 Stuart \'Honey\'': '4s',
        'Tetrarch': '4s',
        'Cromwell': '6s',
        'Crusader Mk III': '5s',
        'Churchill Mk III': '6s',
        'Sherman Firefly': '7s'
    };
    return reloadSpeeds[tank.name] || '6s';
}

function getAmmunition(tank) {
    const ammoCounts = {
        'M4 Sherman': '47 AP, 50 HE',
        'Sherman 75 Jumbo': '45 AP, 48 HE',
        'Sherman 76 Jumbo': '43 AP, 46 HE',
        'M5A1 Stuart': '103 AP, 103 HE',
        'Greyhound': '80 AP, 80 HE',
        'Panzer IV': '45 AP, 48 HE',
        'Panther': '42 AP, 45 HE',
        'Tiger I': '40 AP, 44 HE',
        'Luchs': '180 AP, 180 HE',
        'Puma': '50 AP, 50 HE',
        'T-34': '47 AP, 50 HE',
        'IS-1': '38 AP, 42 HE',
        'T-70': '90 AP, 90 HE',
        'BA-10 Scout Car': '49 AP, 49 HE',
        'Daimler': '52 AP, 52 HE',
        'M3 Stuart \'Honey\'': '103 AP, 103 HE',
        'Tetrarch': '50 AP, 50 HE',
        'Cromwell': '45 AP, 48 HE',
        'Crusader Mk III': '65 AP, 65 HE',
        'Churchill Mk III': '65 AP, 65 HE',
        'Sherman Firefly': '40 AP, 44 HE'
    };
    return ammoCounts[tank.name] || '45 AP, 48 HE';
}

function getStatsDescription(tank) {
    const descriptions = {
        'M4 Sherman': 'The M4 Sherman\'s stats are well-balanced among medium tanks. It holds a good amount of ammunition and has reliable performance.',
        'Sherman 75 Jumbo': 'The Sherman 75 Jumbo\'s stats reflect its heavy tank role - slower turret traverse due to increased armor weight.',
        'Sherman 76 Jumbo': 'The Sherman 76 Jumbo\'s stats show improved firepower over the 75mm Jumbo, with slightly longer reload.',
        'M5A1 Stuart': 'The M5A1 Stuart\'s stats reflect its light tank role - fast turret traverse and quick reload, but limited ammunition.',
        'Greyhound': 'The Greyhound\'s stats are typical for an armored car - very fast turret traverse and reload, with good ammunition capacity.',
        'Panzer IV': 'The Panzer IV\'s stats are typical for a medium tank, with balanced performance across all metrics.',
        'Panther': 'The Panther\'s stats reflect its heavy tank role despite being classified as a medium tank - slower but more powerful.',
        'Tiger I': 'The Tiger I\'s stats show its heavy tank characteristics - slow turret traverse and reload, but devastating firepower.',
        'Luchs': 'The Luchs\'s stats are typical for a light tank - very fast turret traverse and reload, but limited ammunition.',
        'Puma': 'The Puma\'s stats are excellent for an armored car - very fast turret traverse and reload, with good ammunition capacity.',
        'T-34': 'The T-34\'s stats are well-balanced for a medium tank, with good mobility and reasonable reload times.',
        'IS-1': 'The IS-1\'s stats show its heavy tank characteristics - slow turret traverse and reload, but powerful gun.',
        'T-70': 'The T-70\'s stats are typical for a light tank - very fast turret traverse and reload, but limited ammunition.',
        'BA-10 Scout Car': 'The BA-10\'s stats are typical for an armored car - fast turret traverse and reload, with good ammunition capacity.',
        'Daimler': 'The Daimler\'s stats are excellent for an armored car - very fast turret traverse and reload, with good ammunition capacity.',
        'M3 Stuart \'Honey\'': 'The M3 Stuart Honey\'s stats reflect its light tank role - fast turret traverse and quick reload, but limited ammunition.',
        'Tetrarch': 'The Tetrarch\'s stats reflect its ultra-light design - fast turret traverse and reload, with minimal ammunition.',
        'Cromwell': 'The Cromwell\'s stats show excellent mobility for a medium tank, with balanced firepower and reload times.',
        'Crusader Mk III': 'The Crusader Mk III\'s stats show good anti-tank capability with reasonable reload times.',
        'Churchill Mk III': 'The Churchill Mk III\'s stats reflect its heavy tank role - slow turret traverse and reload, but excellent armor.',
        'Sherman Firefly': 'The Sherman Firefly\'s stats show excellent anti-tank capability with slightly longer reload due to the powerful 17-pounder gun.'
    };
    return descriptions[tank.name] || 'This tank\'s stats are well-balanced for its class.';
}

function getDrivingDescription(tank) {
    const descriptions = {
        'M4 Sherman': 'good mobility and turning characteristics',
        'Sherman 75 Jumbo': 'decent mobility for a heavy tank with slower turning',
        'Sherman 76 Jumbo': 'decent mobility for a heavy tank with slower turning',
        'M5A1 Stuart': 'excellent mobility and very fast turning',
        'Greyhound': 'excellent mobility and very fast turning',
        'Panzer IV': 'good mobility and turning characteristics',
        'Panther': 'excellent mobility for its size with good turning',
        'Tiger I': 'decent mobility for a heavy tank with slower turning',
        'Luchs': 'excellent mobility and very fast turning',
        'Puma': 'excellent mobility and very fast turning',
        'T-34': 'excellent mobility and good turning characteristics',
        'IS-1': 'decent mobility for a heavy tank',
        'T-70': 'excellent mobility and very fast turning',
        'BA-10 Scout Car': 'good mobility and fast turning',
        'Daimler': 'excellent mobility and very fast turning',
        'M3 Stuart \'Honey\'': 'excellent mobility and very fast turning',
        'Tetrarch': 'excellent mobility and very fast turning',
        'Cromwell': 'excellent mobility and good turning characteristics',
        'Crusader Mk III': 'good mobility and turning characteristics',
        'Churchill Mk III': 'limited mobility due to its heavy armor',
        'Sherman Firefly': 'good mobility and turning characteristics'
    };
    return descriptions[tank.name] || 'good mobility and turning characteristics';
}

function getTurnTime(tank, gear, degrees) {
    const baseTimes = {
        'reverse': {180: 12, 360: 21.5},
        '1st': {180: 12, 360: 21.5},
        '2nd': {180: 11.5, 360: 23},
        '3rd': {180: 10, 360: 21},
        '4th': {180: 6, 360: 14}
    };
    
    // Adjust based on tank type
    const multipliers = {
        'Light Tank': 0.8,
        'Medium Tank': 1.0,
        'Heavy Tank': 1.3,
        'Recon Vehicle': 0.7
    };
    
    const baseTime = baseTimes[gear][degrees];
    const multiplier = multipliers[tank.type] || 1.0;
    const adjustedTime = baseTime * multiplier;
    
    return adjustedTime.toFixed(1) + 's';
}

function getPerformanceDescription(tank) {
    const descriptions = {
        'M4 Sherman': 'The M4 Sherman shares similar turning characteristics to other medium tanks, with good 4th gear turning speed.',
        'Sherman 75 Jumbo': 'The Sherman 75 Jumbo has slower turning characteristics typical of heavy tanks, but still effective.',
        'Sherman 76 Jumbo': 'The Sherman 76 Jumbo has slower turning characteristics typical of heavy tanks, but still effective.',
        'M5A1 Stuart': 'The M5A1 Stuart has excellent turning characteristics in all gears, making it very maneuverable.',
        'Greyhound': 'The Greyhound has excellent turning characteristics typical of armored cars, with very fast turning.',
        'Panzer IV': 'The Panzer IV has good turning characteristics typical of medium tanks, with effective turning in all gears.',
        'Panther': 'The Panther has excellent turning characteristics for its size, with good turning in all gears.',
        'Tiger I': 'The Tiger I has slower turning characteristics typical of heavy tanks, but still effective.',
        'Luchs': 'The Luchs has excellent turning characteristics typical of light tanks, with very fast turning.',
        'Puma': 'The Puma has excellent turning characteristics typical of armored cars, with very fast turning.',
        'T-34': 'The T-34 has excellent turning characteristics, with good turning in all gears.',
        'IS-1': 'The IS-1 has slower turning characteristics typical of heavy tanks.',
        'T-70': 'The T-70 has excellent turning characteristics typical of light tanks, with very fast turning.',
        'BA-10 Scout Car': 'The BA-10 has good turning characteristics typical of armored cars, with fast turning.',
        'Daimler': 'The Daimler has excellent turning characteristics typical of armored cars, with very fast turning.',
        'M3 Stuart \'Honey\'': 'The M3 Stuart Honey has excellent turning characteristics in all gears, making it very maneuverable.',
        'Tetrarch': 'The Tetrarch has excellent turning characteristics typical of light tanks, with very fast turning.',
        'Cromwell': 'The Cromwell has excellent turning characteristics for a medium tank, with good turning in all gears.',
        'Crusader Mk III': 'The Crusader Mk III has good turning characteristics typical of medium tanks.',
        'Churchill Mk III': 'The Churchill Mk III has slower turning characteristics typical of heavy tanks.',
        'Sherman Firefly': 'The Sherman Firefly has good turning characteristics typical of medium tanks, with effective turning in all gears.'
    };
    return descriptions[tank.name] || 'This tank has good turning characteristics for its class.';
}

function getKillShots(tank, targetType, location) {
    const killShots = {
        'M4 Sherman': {
            'light': {'front': '1', 'side': '1', 'turret': '1', 'rear': '1', 'tracks': '>1'},
            'medium': {'front': '2', 'side': '2', 'turret': '3*', 'rear': '2', 'tracks': '7'},
            'heavy': {'front': 'R', 'side': '2', 'turret': 'R', 'rear': '2', 'tracks': '8'}
        },
        'M4A3E8 Sherman': {
            'light': {'front': '1', 'side': '1', 'turret': '1', 'rear': '1', 'tracks': '>1'},
            'medium': {'front': '2', 'side': '2', 'turret': '2', 'rear': '2', 'tracks': '6'},
            'heavy': {'front': '2*', 'side': '2', 'turret': '3*', 'rear': '2', 'tracks': '7'}
        },
        'M5A1 Stuart': {
            'light': {'front': '1*', 'side': '1', 'turret': '1', 'rear': '1*', 'tracks': '>1'},
            'medium': {'front': 'R', 'side': '2', 'turret': 'R', 'rear': '2', 'tracks': 'R'},
            'heavy': {'front': 'R', 'side': 'R', 'turret': 'R', 'rear': 'R', 'tracks': 'R'}
        },
        'M26 Pershing': {
            'light': {'front': '1', 'side': '1', 'turret': '1', 'rear': '1', 'tracks': '>1'},
            'medium': {'front': '1', 'side': '2', 'turret': '2', 'rear': '2', 'tracks': '5'},
            'heavy': {'front': '2', 'side': '2', 'turret': '2', 'rear': '2', 'tracks': '6'}
        }
    };
    
    // Default values if specific tank not found
    const defaultShots = {
        'light': {'front': '1', 'side': '1', 'turret': '1', 'rear': '1', 'tracks': '>1'},
        'medium': {'front': '2', 'side': '2', 'turret': '3*', 'rear': '2', 'tracks': '7'},
        'heavy': {'front': '2*', 'side': '2', 'turret': 'R', 'rear': '2', 'tracks': '8'}
    };
    
    const tankShots = killShots[tank.name] || defaultShots;
    return tankShots[targetType]?.[location] || '2';
}

function getBestTactics(tank) {
    const tactics = {
        'M4 Sherman': 'Use mobility to flank enemies, engage at medium range',
        'Sherman 75 Jumbo': 'Use frontal armor to lead assaults, engage at medium range',
        'Sherman 76 Jumbo': 'Use frontal armor and improved firepower, engage at medium-long range',
        'M5A1 Stuart': 'Scout and harass, avoid direct engagements with heavier tanks',
        'Greyhound': 'Scout and harass, use speed to escape danger',
        'Panzer IV': 'Use balanced approach, engage at medium range',
        'Panther': 'Use excellent gun to engage at long range, maintain distance',
        'Tiger I': 'Engage at long range, use armor to dominate',
        'Luchs': 'Scout and harass, avoid direct engagements',
        'Puma': 'Scout and harass, use speed and anti-tank capability',
        'T-34': 'Use mobility to flank, engage at medium range',
        'IS-1': 'Use armor and firepower, engage at medium range',
        'T-70': 'Scout and harass, avoid direct engagements',
        'BA-10 Scout Car': 'Scout and harass, use speed to escape danger',
        'Daimler': 'Scout and harass, use speed to escape danger',
        'M3 Stuart \'Honey\'': 'Scout and harass, avoid direct engagements with heavier tanks',
        'Tetrarch': 'Scout and harass, use speed and small size',
        'Cromwell': 'Use excellent speed to flank, engage at medium range',
        'Crusader Mk III': 'Use anti-tank capability, engage at medium range',
        'Churchill Mk III': 'Use armor to lead assaults, engage at medium range',
        'Sherman Firefly': 'Use excellent anti-tank capability, engage at long range'
    };
    return tactics[tank.name] || 'Use balanced approach based on tank type';
}

function getEngagementRange(tank) {
    const ranges = {
        'M4 Sherman': '300-800m',
        'Sherman 75 Jumbo': '400-1000m',
        'Sherman 76 Jumbo': '400-1000m',
        'M5A1 Stuart': '200-500m',
        'Greyhound': '200-400m',
        'Panzer IV': '300-800m',
        'Panther': '500-1200m',
        'Tiger I': '600-1400m',
        'Luchs': '100-300m',
        'Puma': '300-600m',
        'T-34': '300-800m',
        'IS-1': '500-1200m',
        'T-70': '200-500m',
        'BA-10 Scout Car': '200-400m',
        'Daimler': '200-400m',
        'M3 Stuart \'Honey\'': '200-500m',
        'Tetrarch': '200-400m',
        'Cromwell': '400-1000m',
        'Crusader Mk III': '300-800m',
        'Churchill Mk III': '400-1000m',
        'Sherman Firefly': '500-1200m'
    };
    return ranges[tank.name] || '300-800m';
}

// Faction filter event listeners
factionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all faction buttons
        factionBtns.forEach(b => b.classList.remove('active'));
        
        // Add active class to clicked button
        btn.classList.add('active');
        
        // Update current faction and display tanks
        currentFaction = btn.getAttribute('data-faction');
        displayTanks(currentFaction, currentTankType);
    });
});

// Tank type filter event listeners
tankTypeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all tank type buttons
        tankTypeBtns.forEach(b => b.classList.remove('active'));
        
        // Add active class to clicked button
        btn.classList.add('active');
        
        // Update current tank type and display tanks
        currentTankType = btn.getAttribute('data-tank-type');
        displayTanks(currentFaction, currentTankType);
        
        // Close dropdown after selection
        filterDropdown.classList.remove('show');
    });
});

// Filter dropdown toggle
filterToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    filterDropdown.classList.toggle('show');
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!filterToggle.contains(e.target) && !filterDropdown.contains(e.target)) {
        filterDropdown.classList.remove('show');
    }
});

// Penetration Chart with Filtering
function displayPenetrationChart() {
    const factionFilter = document.getElementById('factionFilter').value;
    const typeFilter = document.getElementById('typeFilter').value;
    const penetrationFilter = document.getElementById('penetrationFilter').value;
    
    let filteredData = penetrationData;
    
    // Apply faction filter
    if (factionFilter !== 'all') {
        filteredData = filteredData.filter(item => item.faction === factionFilter);
    }
    
    // Apply type filter
    if (typeFilter !== 'all') {
        filteredData = filteredData.filter(item => item.type === typeFilter);
    }
    
    // Apply penetration filter
    if (penetrationFilter !== 'all') {
        filteredData = filteredData.filter(item => {
            const penetrationValue = parseInt(item.penetration);
            switch (penetrationFilter) {
                case 'high':
                    return penetrationValue >= 150;
                case 'medium':
                    return penetrationValue >= 80 && penetrationValue < 150;
                case 'low':
                    return penetrationValue < 80;
                default:
                    return true;
            }
        });
    }
    
                    penetrationTableBody.innerHTML = filteredData.map(weapon => `
                    <tr>
                        <td>${weapon.tank}</td>
                        <td>${weapon.weapon}</td>
                        <td>${weapon.faction}</td>
                        <td>${weapon.type}</td>
                        <td>${weapon.range}</td>
                        <td>${weapon.penetration}</td>
                        <td>${weapon.effectiveAgainst}</td>
                        <td>${weapon.shotsToKill}</td>
                    </tr>
                `).join('');
}

// Add event listeners for filters
function initializePenetrationFilters() {
    const filters = document.querySelectorAll('.penetration-filter');
    filters.forEach(filter => {
        filter.addEventListener('change', displayPenetrationChart);
    });
}

// Identification Practice
let currentPracticeTank = null;
let practiceTanks = [];
let correctAnswers = 0;
let hasTriggeredFirstBlood = false;
let currentDifficulty = 'easy'; // Default difficulty
let difficultyTankGroups = {}; // Will store tanks grouped by difficulty
let currentImageAngle = '2'; // Track current image angle for answer reveal
let lastPracticeTank = null; // Track last used tank to prevent duplicates

function initializePracticeTanks() {
    // Use all tanks from the database that have 360 view images
    
    // Clear existing arrays
    practiceTanks = [];
    
    Object.values(tankDatabase).forEach(factionTanks => {
        factionTanks.forEach(tank => {
            if (tank.has360View && tank.images360) {
                practiceTanks.push(tank);
            }
        });
    });
    
    // Group tanks by difficulty
    groupTanksByDifficulty();
    
}

function groupTanksByDifficulty() {
    // Note: These groups are now primarily used for home image selection
    // Practice questions use different logic based on difficulty mode
    
    // Filter out SPAs for easy and medium modes
    const nonSPATanks = practiceTanks.filter(tank => tank.type !== 'SPA (Self Propelled Artillery)');
    
    // Easy: Mix of different tank types and factions (no SPAs)
    difficultyTankGroups.easy = [...nonSPATanks];
    
    // Medium: Group similar tank types together (no SPAs)
    difficultyTankGroups.medium = [];
    const tankTypes = ['Heavy Tank', 'Medium Tank', 'Light Tank', 'Recon Vehicle'];
    
    tankTypes.forEach(type => {
        const typeTanks = nonSPATanks.filter(tank => tank.type === type);
        if (typeTanks.length >= 2) {
            // Add 2-3 tanks of the same type for medium difficulty
            const selectedTanks = typeTanks.slice(0, Math.min(3, typeTanks.length));
            difficultyTankGroups.medium.push(...selectedTanks);
        }
    });
    
    // Hard: Include ALL tanks from all factions including SPAs for maximum variety
    // Note: This group is now used for home image selection only
    // Practice questions for Hard mode use ALL tanks from practiceTanks
    difficultyTankGroups.hard = [...practiceTanks];
}

function setDifficulty(difficulty) {
    currentDifficulty = difficulty;
    
    // Update active button
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-difficulty="${difficulty}"]`).classList.add('active');
    
    // Reinitialize practice tanks with new difficulty
    initializePracticeTanks();
    
    // Clear only the practice options, not the tank image
    const practiceOptions = document.getElementById('practiceOptions');
    if (practiceOptions) practiceOptions.innerHTML = '';
    
    // Update home image based on difficulty (after clearing options)
    updateHomeImage(difficulty);
}

function updateHomeImage(difficulty) {
    const practiceTankImage = document.getElementById('practiceTankImage');
    if (!practiceTankImage) return;
    
    let selectedTank = null;
    let imageNumber = '2'; // Always use image 2 for home display
    
    switch (difficulty) {
        case 'easy':
            // Find M5A1 Stuart tank specifically
            selectedTank = practiceTanks.find(tank => tank.name === 'M5A1 Stuart');
            break;
        case 'medium':
            // Find M4 Sherman specifically
            selectedTank = practiceTanks.find(tank => tank.name === 'M4 Sherman');
            break;
        case 'hard':
            // Find Sherman 76 Jumbo specifically
            selectedTank = practiceTanks.find(tank => tank.name === 'Sherman 76 Jumbo');
            break;
    }
    if (selectedTank && selectedTank.images360) {
        const imageHTML = `
            <img src="${selectedTank.images360.prefix}${imageNumber}${selectedTank.images360.suffix}?v=${buildVersion}" 
                 alt="Tank to identify" 
                 loading="lazy"
                 style="max-width: 100%; height: auto;">
        `;
        practiceTankImage.innerHTML = imageHTML;
    } else {
        // Fallback to generic placeholder
        practiceTankImage.innerHTML = '<img src="" alt="Tank to identify">';
    }
}

function startNewPractice() {
    // Get tanks for current difficulty based on mode requirements
    let availableTanks;
    if (currentDifficulty === 'easy') {
        // Easy mode: Use half of all tanks (excluding SPAs), only image 2
        const nonSPATanks = practiceTanks.filter(tank => tank.type !== 'SPA (Self Propelled Artillery)');
        availableTanks = nonSPATanks.slice(0, Math.ceil(nonSPATanks.length / 2));
    } else if (currentDifficulty === 'medium') {
        // Medium mode: Use all tanks (excluding SPAs), only image 2
        availableTanks = practiceTanks.filter(tank => tank.type !== 'SPA (Self Propelled Artillery)');
    } else if (currentDifficulty === 'hard') {
        // Hard mode: Use ALL tanks from all factions/types including SPAs, all image angles
        availableTanks = practiceTanks;
    }
    
    if (availableTanks.length === 0) {
        initializePracticeTanks();
        return;
    }
    
    // Select random tank, ensuring no duplicate from last practice
    let selectedTank;
    let attempts = 0;
    const maxAttempts = 50; // Prevent infinite loops
    
    do {
        const randomIndex = Math.floor(Math.random() * availableTanks.length);
        selectedTank = availableTanks[randomIndex];
        attempts++;
        
        // If we've tried too many times, just use the current selection
        if (attempts >= maxAttempts) {
            break;
        }
    } while (lastPracticeTank && selectedTank.name === lastPracticeTank.name);
    
    currentPracticeTank = selectedTank;
    lastPracticeTank = selectedTank; // Update for next practice
    
    // Create practice options based on difficulty
    const options = [currentPracticeTank.name];
    let otherTanks = availableTanks.filter(tank => tank.name !== currentPracticeTank.name);
    
    // For hard mode, try to include tanks of the same type/faction for more challenge
    if (currentDifficulty === 'hard') {
        const sameTypeTanks = availableTanks.filter(tank => 
            tank.type === currentPracticeTank.type && tank.name !== currentPracticeTank.name
        );
        if (sameTypeTanks.length > 0) {
            otherTanks = sameTypeTanks;
        }
    }
    
    // Add wrong answers
    for (let i = 0; i < 3; i++) {
        if (otherTanks.length > 0) {
        const randomTank = otherTanks[Math.floor(Math.random() * otherTanks.length)];
            if (!options.includes(randomTank.name)) {
                options.push(randomTank.name);
            }
        }
    }
    
    // If we don't have enough options, add some from the general pool
    while (options.length < 4 && practiceTanks.length > options.length) {
        const randomTank = practiceTanks[Math.floor(Math.random() * practiceTanks.length)];
        if (!options.includes(randomTank.name)) {
            options.push(randomTank.name);
        }
    }
    
    // Shuffle options
    options.sort(() => Math.random() - 0.5);
    
    // Choose image based on difficulty
    let imageNumber;
    if (currentDifficulty === 'easy' || currentDifficulty === 'medium') {
        // Easy and Medium modes: Always use image 2
        imageNumber = '2';
    } else if (currentDifficulty === 'hard') {
        // Hard mode: Randomly choose from different angles (1-7, since some tanks only have 0-7)
        const possibleAngles = ['1', '2', '3', '4', '5', '6', '7'];
        imageNumber = possibleAngles[Math.floor(Math.random() * possibleAngles.length)];
    }
    
    // Store the current image angle for answer reveal
    currentImageAngle = imageNumber;
    
    // Use selected image from the 360 viewer for practice identification
    const images360 = currentPracticeTank.images360;
    const imageHTML = `
        <img src="${images360.prefix}${imageNumber}${images360.suffix}?v=${buildVersion}" 
             alt="${currentPracticeTank.name} - Practice" 
             loading="lazy"
             style="max-width: 100%; height: auto; filter: brightness(0) contrast(100%);"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
        >
        <div style="display: none; align-items: center; justify-content: center; height: 100%; color: var(--text-secondary); font-style: italic;">
            <i class="${currentPracticeTank.icon}" style="font-size: 3rem; margin-right: 1rem;"></i>
            <span>Practice Image Not Available</span>
        </div>
    `;
    
    practiceTankImage.innerHTML = imageHTML;
    
    practiceOptions.innerHTML = options.map(option => 
        `<button class="practice-option" onclick="checkAnswer('${option.replace(/'/g, "\\'")}')">${option}</button>`
    ).join('');
}

// Helper function to get the correct folder name for each tank
function getTankFolderName(tankName) {
    const folderMap = {
        'M4 Sherman': 'm4-sherman',
        'Sherman 75 Jumbo': 'sherman-75-jumbo',
        'Sherman 76 Jumbo': 'sherman-76-jumbo',
        'M5A1 Stuart': 'm5a1-stuart',
        'Greyhound': 'greyhound',
        'Panzer IV': 'panzer-iv',
        'Panther': 'panther',
        'Tiger I': 'tiger-i',
        'Luchs': 'luchs',
        'Puma': 'puma',
        'T-34': 't-34',
        'IS-1': 'is-1',
        'T-70': 't-70',
        'BA-10 Scout Car': 'ba-10-scout-car',
        'Daimler': 'daimler',
        "M3 Stuart 'Honey'": 'm3-stuart-honey',
        'Tetrarch': 'tetrarch',
        'Cromwell': 'cromwell',
                 'Crusader Mk III': 'crusader-mk-iii',
         'Sherman Firefly': 'sherman-firefly'
    };
    
    return folderMap[tankName] || tankName.toLowerCase().replace(/\s+/g, '-');
}

function checkAnswer(selectedAnswer) {
    const isCorrect = selectedAnswer === currentPracticeTank.name;
    
    if (isCorrect) {
        correctAnswers++;
        
        // Check for FIRST BLOOD achievement!
        if (correctAnswers === 1 && !hasTriggeredFirstBlood) {
            hasTriggeredFirstBlood = true;
            triggerFirstBloodCelebration();
        }
    }
    
    const resultMessage = isCorrect ? 
        `<p style="color: var(--success); font-weight: bold;">Correct! That's a ${currentPracticeTank.name}.</p>` :
        `<p style="color: var(--error); font-weight: bold;">Incorrect. That's actually a ${currentPracticeTank.name}.</p>`;
    
              // Show the original image (not silhouette) when revealing the answer
    // Use the same image angle that was used in the practice
    const originalImage = `${currentPracticeTank.images360.prefix}${currentImageAngle}${currentPracticeTank.images360.suffix}?v=${buildVersion}`;
    
    practiceTankImage.innerHTML = `
        <img src="${originalImage}" 
             alt="${currentPracticeTank.name}" 
             loading="lazy"
             style="max-width: 100%; height: auto;">
    `;
    
    practiceOptions.innerHTML = `
        <div style="grid-column: 1 / -1;">
            ${resultMessage}
            <p><strong>Faction:</strong> ${currentPracticeTank.faction}</p>
            <p><strong>Type:</strong> ${currentPracticeTank.type}</p>
            <p><strong>Gun:</strong> ${currentPracticeTank.gun}</p>
            <p><strong>Correct Answers:</strong> ${correctAnswers}</p>
            <button class="calculate-btn" onclick="startNewPractice()" style="margin-top: 1rem;">Next Tank</button>
        </div>
    `;
}

function triggerFirstBloodCelebration() {
    
    // Create the celebration overlay
    const celebration = document.createElement('div');
    celebration.id = 'first-blood-celebration';
    celebration.innerHTML = `
        <div class="celebration-content">
            <div class="achievement-popup">
                <div class="achievement-icon">🎯</div>
                <h2>FIRST BLOOD!</h2>
                <p>You've identified your first tank!</p>
                <div class="achievement-stats">
                    <span>🏆 Achievement Unlocked</span>
                    <span>⚡ +100 XP</span>
                </div>
            </div>
        </div>
        <div class="explosion-particles"></div>
        <div class="confetti-container"></div>
        <div class="screen-flash"></div>
        <div class="tank-explosion"></div>
        <div class="matrix-rain"></div>
    `;
    
    document.body.appendChild(celebration);
    
    // Trigger all the crazy effects
    triggerScreenShake();
    createExplosionParticles();
    createConfetti();
    triggerScreenFlash();
    createTankExplosion();
    createMatrixRain();
    playVictorySound();
    
    // Remove everything after 5 seconds
    setTimeout(() => {
        if (document.getElementById('first-blood-celebration')) {
            document.body.removeChild(celebration);
        }
    }, 5000);
}

function triggerScreenShake() {
    document.body.style.animation = 'screenShake 0.5s ease-in-out';
    setTimeout(() => {
        document.body.style.animation = '';
    }, 500);
}

function createExplosionParticles() {
    const particles = document.querySelector('.explosion-particles');
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'explosion-particle';
        const randomX = (Math.random() - 0.5) * 200;
        const randomY = (Math.random() - 0.5) * 200;
        particle.style.cssText = `
            position: absolute;
            width: 4px;
            height: 4px;
            background: linear-gradient(45deg, #ff4444, #ff8800, #ffff00);
            border-radius: 50%;
            left: 50%;
            top: 50%;
            animation: explode 1s ease-out forwards;
            animation-delay: ${Math.random() * 0.3}s;
            --random-x: ${randomX}px;
            --random-y: ${randomY}px;
        `;
        particles.appendChild(particle);
    }
}

function createConfetti() {
    const confetti = document.querySelector('.confetti-container');
    const colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff'];
    const shapes = ['🎯', '💥', '🔥', '⚡', '🏆', '🎖️'];
    
    for (let i = 0; i < 100; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.textContent = shapes[Math.floor(Math.random() * shapes.length)];
        piece.style.cssText = `
            position: absolute;
            font-size: 20px;
            left: ${Math.random() * 100}%;
            top: -50px;
            animation: confettiFall 3s linear forwards;
            animation-delay: ${Math.random() * 2}s;
            z-index: 1001;
        `;
        confetti.appendChild(piece);
    }
}

function triggerScreenFlash() {
    const flash = document.querySelector('.screen-flash');
    flash.style.animation = 'screenFlash 0.3s ease-out';
}

function createTankExplosion() {
    const explosion = document.querySelector('.tank-explosion');
    explosion.innerHTML = `
        <div class="explosion-fire"></div>
        <div class="explosion-smoke"></div>
        <div class="explosion-debris"></div>
    `;
    explosion.style.animation = 'tankExplosion 2s ease-out';
}

function createMatrixRain() {
    const matrix = document.querySelector('.matrix-rain');
    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    
    for (let i = 0; i < 20; i++) {
        const column = document.createElement('div');
        column.className = 'matrix-column';
        column.style.cssText = `
            position: absolute;
            left: ${Math.random() * 100}%;
            top: -100%;
            color: #00ff00;
            font-family: monospace;
            font-size: 20px;
            animation: matrixFall 2s linear forwards;
            animation-delay: ${Math.random() * 1}s;
        `;
        
        for (let j = 0; j < 10; j++) {
            const char = document.createElement('div');
            char.textContent = chars[Math.floor(Math.random() * chars.length)];
            char.style.animationDelay = `${j * 0.1}s`;
            column.appendChild(char);
        }
        
        matrix.appendChild(column);
    }
}

function playVictorySound() {
    // Play the victory sound
    const audio = document.getElementById('victorySound');
    if (audio) {
        audio.currentTime = 0;
        audio.volume = 0.6;

    }
}

// Global background state
let globalBackground = 'snow'; // Default background

// Background switching functionality
function initializeBackgroundSwitching() {
    // Add event delegation for background buttons
    document.addEventListener('click', (e) => {
        if (e.target.closest('.bg-btn')) {
            e.preventDefault();
            e.stopPropagation();

            const button = e.target.closest('.bg-btn');
            const backgroundType = button.dataset.background;
            
            // Update global background state
            globalBackground = backgroundType;
            
            // Update all tank images to use the new background
            const allTankImages = document.querySelectorAll('.tank-image');

            allTankImages.forEach(tankImage => {
                // Remove all background classes
                tankImage.classList.remove('bg-grass', 'bg-snow', 'bg-desert');
                
                // Add the selected background class
                tankImage.classList.add(`bg-${backgroundType}`);
                
                // Update button states in this tank image
                const allButtons = tankImage.querySelectorAll('.bg-btn');
                allButtons.forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.background === backgroundType) {
                        btn.classList.add('active');
                    }
                });
            });
        }
    });
    
}

// Hash Routing System
let isUpdatingHash = false;

function initializeHashRouting() {
    // Handle hash changes (back/forward button or direct hash change)
    window.addEventListener('hashchange', handleHashChange);

    // Handle initial page load with hash
    handleHashChange();
}

function handleHashChange() {
    // Ignore hash changes that we triggered ourselves
    if (isUpdatingHash) {
        isUpdatingHash = false;
        return;
    }

    // Get the hash without the # symbol
    let hash = window.location.hash.substring(1);

    // List of valid section IDs
    const validSections = ['overview', 'tanks', 'tactics', 'identification', 'ranging', 'community'];

    // Parse hash for deep routing (e.g., tanks/sherman-76-jumbo or ranging/panther)
    const hashParts = hash.split('/');
    const section = hashParts[0];
    const subRoute = hashParts[1];

    // If no hash or invalid hash, default to overview
    if (!hash || !validSections.includes(section)) {
        showSection('overview', false);
        // Scroll to top on initial load when no hash routing
        if (!hash) {
            window.scrollTo({top: 0, behavior: 'smooth'});
        }
        return;
    }

    // Check if we're already on this section
    const currentSection = document.querySelector('.section.active');
    const isAlreadyOnSection = currentSection && currentSection.id === section;

    // Only show section if we're not already on it (to avoid closing expanded tiles)
    if (!isAlreadyOnSection) {
        showSection(section, false);
    }

    // Handle sub-routes after section is shown
    if (subRoute) {
        // Wait for section to be shown, then handle sub-route
        setTimeout(() => {
            handleSubRoute(section, subRoute);
        }, 300);
    }
}

function handleSubRoute(section, subRoute) {
    if (section === 'tanks') {
        // Find and expand the tank card
        expandTankByName(subRoute);
    } else if (section === 'ranging') {
        // Check if it's a special ranging tool or a tank scope
        if (subRoute === 'artillery') {
            expandArtilleryCalculator();
        } else if (subRoute === 'armor-sights') {
            expandArmorSights();
        } else {
            // Open the scope view for the tank (updateHash = false to avoid loop)
            openScopeView(subRoute, false);
        }
    }
}

function expandArtilleryCalculator() {
    const rangingTools = document.querySelectorAll('.ranging-tool');
    rangingTools.forEach(tool => {
        const title = tool.querySelector('h3');
        if (title && title.textContent.includes('Artillery Calculator')) {
            expandTile(tool, false);
        }
    });
}

function expandArmorSights() {
    const rangingTools = document.querySelectorAll('.ranging-tool');
    rangingTools.forEach(tool => {
        const title = tool.querySelector('h3');
        if (title && title.textContent.includes('Armor Sights')) {
            expandTile(tool, false);

            // Set default active states for filters
            const factionBtns = tool.querySelectorAll('.faction-filter-btn');
            const typeBtns = tool.querySelectorAll('.type-filter-btn');

            // Remove active from all faction buttons and set "All" as active
            factionBtns.forEach(btn => btn.classList.remove('active'));
            const allFactionBtn = tool.querySelector('.faction-filter-btn[data-faction="all"]');
            if (allFactionBtn) allFactionBtn.classList.add('active');

            // Remove active from all type buttons and set "All Types" as active
            typeBtns.forEach(btn => btn.classList.remove('active'));
            const allTypeBtn = tool.querySelector('.type-filter-btn[data-tank-type="all"]');
            if (allTypeBtn) allTypeBtn.classList.add('active');
        }
    });
}

function expandTankByName(tankName) {
    // Normalize the tank name (replace hyphens with spaces and match case-insensitive)
    const normalizedName = tankName.replace(/-/g, ' ');

    // Find the tank card
    const tankCards = document.querySelectorAll('.tank-card');
    tankCards.forEach(card => {
        const cardTankName = card.querySelector('.tank-name');
        if (cardTankName && cardTankName.textContent.toLowerCase() === normalizedName.toLowerCase()) {
            expandTankCard(card);
        }
    });
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Display initial content
    displayTanks('all', 'all');
    initializePracticeTanks();
    // Don't start practice immediately - let user select difficulty first
    
    // Initialize background switching functionality
    initializeBackgroundSwitching();
    
    // Initialize comparison functionality
    initializeComparison();

    // Initialize hash routing
    initializeHashRouting();
});

// Debug function to check comparison elements
function debugComparisonElements() {
}

// Initialize comparison functionality
function initializeComparison() {

    // Add event listeners for comparison
    if (compareToggle) {
        compareToggle.addEventListener('click', toggleComparisonMode);

    } else {

    }

    if (closeComparison) {
        closeComparison.addEventListener('click', () => {
            comparisonMode = false;
            compareToggle.classList.remove('active');
            comparisonPanel.style.display = 'none';
            hideCompareButtons();
            resetComparison();
        });

    } else {

    }

    if (clearComparison) {
        clearComparison.addEventListener('click', () => {
            resetComparison();
            // Remove selected state from all compare buttons
            document.querySelectorAll('.compare-btn.selected').forEach(btn => {
                btn.classList.remove('selected');
            });
        });

    } else {

    }

}

// Smooth scrolling is handled by the showSection function

// Add keyboard navigation support
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        // Reset to overview section
        showSection('overview');
    }
    
    // Handle arrow keys for 360 viewer rotation
    // Check if any 360 viewer is currently visible
    const activeViewer = document.querySelector('.tank-360-viewer');
    if (activeViewer && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault(); // Prevent default scrolling
        const tankId = activeViewer.getAttribute('data-tank-id');
        if (tankId) {
            const direction = e.key === 'ArrowLeft' ? -1 : 1;
            rotateTank(tankId, direction);
        }
    }
});

// Add loading animation
window.addEventListener('load', () => {
    document.body.style.opacity = '1';
    // Ensure page starts at top on initial load
    window.scrollTo(0, 0);
});

// Add responsive behavior for mobile devices
function handleMobileNavigation() {
    const nav = document.querySelector('.nav-list');
    if (window.innerWidth <= 768) {
        nav.style.flexDirection = 'column';
    } else {
        nav.style.flexDirection = 'row';
    }
}

window.addEventListener('resize', handleMobileNavigation);
handleMobileNavigation(); // Initial call

// PornHub Easter Egg Functionality
let secretThemeActive = false;

// Initialize easter egg trigger
document.addEventListener('DOMContentLoaded', function () {
    const easterEggTrigger = document.getElementById('easterEggTrigger');
    if (easterEggTrigger) {
        easterEggTrigger.addEventListener('click', activateSecretTheme);
    }
});

function activateSecretTheme() {
    if (secretThemeActive) return;
    
    // Add PornHub theme class to body
    document.body.classList.add('secret-theme');
    secretThemeActive = true;
    
    // Show deactivation button
    const deactivateBtn = document.getElementById('secretDeactivate');
    if (deactivateBtn) {
        deactivateBtn.style.display = 'block';
    }
    
    // Play a fun sound effect (optional)
    playSecretSound();
    
    // Add some fun console messages

}

function deactivateSecretTheme() {
    if (!secretThemeActive) return;
    
    // Remove PornHub theme class from body
    document.body.classList.remove('secret-theme');
    secretThemeActive = false;
    
    // Hide deactivation button
    const deactivateBtn = document.getElementById('secretDeactivate');
    if (deactivateBtn) {
        deactivateBtn.style.display = 'none';
    }
}

function playSecretSound() {
    // Play the wow.mp3 sound for the ARMOR HUB activation
    try {
        const wowSound = new Audio('./wow.mp3');
        wowSound.volume = 0.7; // Set volume to 70%
        wowSound.play().catch(error => {});
    } catch (error) {
    }
}

// Artillery Calculator Functionality
document.addEventListener('DOMContentLoaded', function () {
    const artyCalculateBtn = document.getElementById('artyCalculateBtn');
    const artyDistance = document.getElementById('artyDistance');
    const artyFaction = document.getElementById('artyFaction');
    const artyResultsBody = document.getElementById('artyResultsBody');
    
    if (artyCalculateBtn) {
        artyCalculateBtn.addEventListener('click', calculateArtillery);
    }
    
    // Add Enter key functionality to the distance input
    if (artyDistance) {
        artyDistance.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent form submission
                calculateArtillery();
            }
        });
    }
    
    // Load saved results from localStorage
    loadArtilleryResults();
});

function calculateArtillery() {
    const distance = parseInt(document.getElementById('artyDistance').value);
    const faction = document.getElementById('artyFaction').value;
    
    if (!distance || distance <= 0) {
        alert('Please enter a valid distance');
        return;
    }
    
    try {
        // Calculate artillery result using the new calculation system
        const result = calculateArtilleryResult(distance, faction);
        
        // Save the result
        saveArtilleryResult(distance, result, faction);
        
        // Display the most recent calculation prominently
        displayRecentCalculation(result, distance, faction);
        
        // Clear the input
        document.getElementById('artyDistance').value = '';
        
        // Reload the results table
        loadArtilleryResults();
    } catch (error) {
        alert(error.message);
    }
}

function calculateArtilleryResult(distance, faction) {
    // Artillery calculation using faction-specific coefficients
    const xMin = 100;
    const xMax = 1600;
    
    // Check distance bounds
    if (distance < xMin || distance > xMax) {
        throw new Error(`Enter a distance between ${xMin} and ${xMax} meters`);
    }
    
    // Faction-specific calculation coefficients
    const options = {
        'soviet': {
            m: -0.2136691176,
            b: 1141.7215,
        },
        'german': {
            m: -0.237035714285714,
            b: 1001.46547619048,
        },
        'british': {
            m: -0.1773,
            b: 550.69,
        },
        'usa': {
            m: -0.237035714285714, // Using German coefficients for USA (same as allies)
            b: 1001.46547619048,
        }
    };
    
    const factionOptions = options[faction];
    if (!factionOptions) {
        throw new Error('Invalid faction selected');
    }
    
    // Calculate using the formula: result = m * distance + b
    const {m, b} = factionOptions;
    const result = Math.round(m * distance + b);
    
    // Format the result for display with mills as the focal point
    return `${result} mills`;
}

function saveArtilleryResult(distance, result, faction) {
    let results = JSON.parse(localStorage.getItem('artilleryResults') || '[]');
    
    const newResult = {
        id: Date.now(),
        distance: distance,
        result: result,
        faction: faction,
        timestamp: new Date().toLocaleString()
    };
    
    // Add new result at the beginning (newest first)
    results.unshift(newResult);
    
    // Keep only the last 3 results
    if (results.length > 3) {
        results = results.slice(0, 3);
    }
    
    localStorage.setItem('artilleryResults', JSON.stringify(results));
}

function loadArtilleryResults() {
    const artyResultsBody = document.getElementById('artyResultsBody');
    if (!artyResultsBody) return;
    
    const results = JSON.parse(localStorage.getItem('artilleryResults') || '[]');
    
    // Update the recent calculation display if there are results
    if (results.length > 0) {
        const mostRecent = results[0]; // First result is the most recent due to unshift()
        displayRecentCalculation(mostRecent.result, mostRecent.distance, mostRecent.faction);
    } else {
        // Reset the recent calculation display
        const recentCalculationDiv = document.getElementById('recentCalculation');
        if (recentCalculationDiv) {
            recentCalculationDiv.innerHTML = '<p>No calculation performed yet</p>';
        }
    }
    
    if (results.length === 0) {
        artyResultsBody.innerHTML = '<tr class="no-results"><td colspan="4">No calculations saved yet</td></tr>';
        return;
    }
    
    let html = '';
    results.forEach(result => {
        // Extract the mills value from the result string for emphasis
        const millsMatch = result.result.match(/^(\d+)\s+mills/);
        const millsValue = millsMatch ? millsMatch[1] : '';
        
        html += `
            <tr>
                <td><strong style="color: var(--accent);">${millsValue} mills</strong></td>
                <td>${result.distance}m</td>
                <td>${getFactionDisplayName(result.faction)}</td>
                <td><button class="delete-btn" onclick="deleteArtilleryResult(${result.id})">Delete</button></td>
            </tr>
        `;
    });
    
    artyResultsBody.innerHTML = html;
}

function deleteArtilleryResult(id) {
    let results = JSON.parse(localStorage.getItem('artilleryResults') || '[]');
    results = results.filter(result => result.id !== id);
    localStorage.setItem('artilleryResults', JSON.stringify(results));
    loadArtilleryResults(); // This will also update the recent calculation display
}

function getFactionDisplayName(faction) {
    const factionNames = {
        'usa': 'USA',
        'german': 'Germany',
        'soviet': 'Soviet Union',
        'british': 'Great Britain'
    };
    return factionNames[faction] || faction;
}

function displayRecentCalculation(result, distance, faction) {
    const recentCalculationDiv = document.getElementById('recentCalculation');
    if (!recentCalculationDiv) return;
    
    // Extract the mills value from the result
    const millsMatch = result.match(/^(\d+)\s+mills/);
    const millsValue = millsMatch ? millsMatch[1] : '';
    
    // Display the most recent calculation prominently
    recentCalculationDiv.innerHTML = `
        <div class="recent-result">
            <span class="mills-value">${millsValue} mills</span>
            <span class="calculation-details">${getFactionDisplayName(faction)} Artillery at ${distance}m</span>
        </div>
    `;
}

// SPA Calculator Functionality
document.addEventListener('DOMContentLoaded', function () {
    const spaCalculateBtn = document.getElementById('spaCalculateBtn');
    const spaDistance = document.getElementById('spaDistance');
    const spaType = document.getElementById('spaType');
    const spaResultsBody = document.getElementById('spaResultsBody');
    const spaAdjustmentToggle = document.getElementById('spaAdjustmentToggle');
    
    if (spaCalculateBtn) {
        spaCalculateBtn.addEventListener('click', calculateSPA);
    }
    
    // Toggle plus/minus for terrain adjustment
    if (spaAdjustmentToggle) {
        spaAdjustmentToggle.addEventListener('click', function() {
            this.textContent = this.textContent === '+' ? '-' : '+';
        });
    }
    
    // Add Enter key functionality to the distance input
    if (spaDistance) {
        spaDistance.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent form submission
                calculateSPA();
            }
        });
    }
    
    // Load saved results from localStorage
    loadSPAResults();
});

function calculateSPA() {
    const distance = parseInt(document.getElementById('spaDistance').value);
    const spaType = document.getElementById('spaType').value;
    const terrainAdjustment = parseFloat(document.getElementById('spaTerrainAdjustment').value) || 0;
    // When "+" is selected, subtract mills (round goes further). When "-" is selected, add mills (round goes shorter).
    const adjustmentSign = document.getElementById('spaAdjustmentToggle').textContent === '+' ? -1 : 1;
    const finalAdjustment = terrainAdjustment * adjustmentSign;
    
    if (!distance || distance <= 0) {
        alert('Please enter a valid distance');
        return;
    }
    
    try {
        // Calculate SPA result using the new calculation system
        const result = calculateSPAResult(distance, spaType, finalAdjustment);
        
        // Save the result
        saveSPAResult(distance, result, spaType);
        
        // Display the most recent calculation prominently
        displayRecentSPACalculation(result, distance, spaType);
        
        // Clear the input
        document.getElementById('spaDistance').value = '';
        
        // Reload the results table
        loadSPAResults();
        
    } catch (error) {
        alert(error.message);
    }
}

function calculateSPAResult(distance, spaType, terrainAdjustment = 0) {
    // SPA calculation using type-specific formulas
    const xMin = 200;
    const xMax = 600;
    
    // Check distance bounds
    if (distance < xMin || distance > xMax) {
        throw new Error(`Enter a distance between ${xMin} and ${xMax} meters`);
    }
    
    let result;
    
    // Calculate based on SPA type
    switch (spaType) {
        case 'usa':
            // US/GER/SOV: -0.665113 * (distance - 1001.2)
            result = -0.665113 * (distance - 1001.2);
            break;
        case 'churchill':
            // Brit Churchill: -0.445529 * (distance - 998.869)
            result = -0.445529 * (distance - 998.869);
            break;
        case 'bishop':
            // Brit Bishop: -0.334887 * (distance - 997.62)
            result = -0.334887 * (distance - 997.62);
            break;
        default:
            throw new Error('Invalid SPA type selected');
    }
    
    // Apply terrain/pitch adjustment
    result = result + terrainAdjustment;
    
    // Round the result
    result = Math.round(result);
    
    // Format the result for display with mills as the focal point
    return `${result} mills`;
}

function saveSPAResult(distance, result, spaType) {
    let results = JSON.parse(localStorage.getItem('spaResults') || '[]');
    
    const newResult = {
        id: Date.now(),
        distance: distance,
        result: result,
        spaType: spaType,
        timestamp: new Date().toLocaleString()
    };
    
    // Add new result at the beginning (newest first)
    results.unshift(newResult);
    
    // Keep only the last 3 results
    if (results.length > 3) {
        results = results.slice(0, 3);
    }
    
    localStorage.setItem('spaResults', JSON.stringify(results));
}

function loadSPAResults() {
    const spaResultsBody = document.getElementById('spaResultsBody');
    if (!spaResultsBody) return;
    
    const results = JSON.parse(localStorage.getItem('spaResults') || '[]');
    
    // Update the recent calculation display if there are results
    if (results.length > 0) {
        const mostRecent = results[0]; // First result is the most recent due to unshift()
        displayRecentSPACalculation(mostRecent.result, mostRecent.distance, mostRecent.spaType);
    } else {
        // Reset the recent calculation display
        const recentCalculationDiv = document.getElementById('recentSpaCalculation');
        if (recentCalculationDiv) {
            recentCalculationDiv.innerHTML = '<p>No calculation performed yet</p>';
        }
    }
    
    if (results.length === 0) {
        spaResultsBody.innerHTML = '<tr class="no-results"><td colspan="4">No calculations saved yet</td></tr>';
        return;
    }
    
    let html = '';
    results.forEach(result => {
        // Extract the mills value from the result string for emphasis
        const millsMatch = result.result.match(/^(\d+)\s+mills/);
        const millsValue = millsMatch ? millsMatch[1] : '';
        
        html += `
            <tr>
                <td><strong style="color: var(--accent);">${millsValue} mills</strong></td>
                <td>${result.distance}m</td>
                <td>${getSPATypeDisplayName(result.spaType)}</td>
                <td><button class="delete-btn" onclick="deleteSPAResult(${result.id})">Delete</button></td>
            </tr>
        `;
    });
    
    spaResultsBody.innerHTML = html;
}

function deleteSPAResult(id) {
    let results = JSON.parse(localStorage.getItem('spaResults') || '[]');
    results = results.filter(result => result.id !== id);
    localStorage.setItem('spaResults', JSON.stringify(results));
    loadSPAResults(); // This will also update the recent calculation display
}

function getSPATypeDisplayName(spaType) {
    const spaTypeNames = {
        'usa': 'USA / Germany / Soviet',
        'churchill': 'British Churchill',
        'bishop': 'British Bishop'
    };
    return spaTypeNames[spaType] || spaType;
}

function displayRecentSPACalculation(result, distance, spaType) {
    const recentCalculationDiv = document.getElementById('recentSpaCalculation');
    if (!recentCalculationDiv) return;
    
    // Extract the mills value from the result
    const millsMatch = result.match(/^(\d+)\s+mills/);
    const millsValue = millsMatch ? millsMatch[1] : '';
    
    // Display the most recent calculation prominently
    recentCalculationDiv.innerHTML = `
        <div class="recent-result">
            <span class="mills-value">${millsValue} mills</span>
            <span class="calculation-details">${getSPATypeDisplayName(spaType)} SPA at ${distance}m</span>
        </div>
    `;
}

// Armor Sights System
function initializeArmorSights() {
    const tankSelectionGrid = document.getElementById('tankSelectionGrid');
    if (!tankSelectionGrid) return;
    
    // Populate tank selection grid
    populateTankSelectionGrid();
    
    // Add faction filter event listeners
    const factionFilterBtns = document.querySelectorAll('.faction-filter-btn');
    factionFilterBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            const faction = this.getAttribute('data-faction');
            filterTanksByFaction(faction);
            
            // Update active state
            factionFilterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Add tank type filter event listeners
    const typeFilterBtns = document.querySelectorAll('.type-filter-btn');
    typeFilterBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            const tankType = this.getAttribute('data-tank-type');
            filterTanksByType(tankType);
            
            // Update active state
            typeFilterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function populateTankSelectionGrid() {
    const tankSelectionGrid = document.getElementById('tankSelectionGrid');
    if (!tankSelectionGrid) {

        return;
    }
    
    let html = '';
    let totalTanks = 0;
    
    // Iterate through each faction in the tank database
    Object.values(tankDatabase).forEach(factionTanks => {
        factionTanks.forEach(tank => {
            
            // Normalize faction name for filtering
            let normalizedFaction = tank.faction.toLowerCase();
            if (normalizedFaction === 'soviet union') normalizedFaction = 'soviet';
            if (normalizedFaction === 'great britain') normalizedFaction = 'british';
            
            // Normalize tank type for filtering
            let normalizedType = tank.type.toLowerCase();
            if (normalizedType.includes('heavy')) normalizedType = 'heavy';
            else if (normalizedType.includes('medium')) normalizedType = 'medium';
            else if (normalizedType.includes('light')) normalizedType = 'light';
            else if (normalizedType.includes('recon')) normalizedType = 'recon';
            else if (normalizedType.includes('spa') || normalizedType.includes('self propelled')) normalizedType = 'spa';
            
            // Get the tank's directory name for the image path
            const tankDirName = tank.images360.prefix.split('/').filter(part => part.length > 0).pop();
            
            const imagePath = `images/360/${tankDirName}/2.webp?v=${buildVersion}`;
            
            html += `
                <div class="tank-option" data-tank="${tank.name}" data-faction="${normalizedFaction}" data-tank-type="${normalizedType}">
                    <img src="${imagePath}" alt="${tank.name}" loading="lazy">
                    <span>${tank.name}</span>
                </div>
            `;
            totalTanks++;
        });
    });
    
    tankSelectionGrid.innerHTML = html;
    
    // Add click event listeners to tank options
    const tankOptions = document.querySelectorAll('.tank-option');
    
    tankOptions.forEach(option => {
        option.addEventListener('click', function () {
            const tankName = this.getAttribute('data-tank');

            openScopeView(tankName);
        });
    });
}

function filterTanksByFaction(faction) {
    applyTankFilters();
}

function filterTanksByType(tankType) {
    applyTankFilters();
}

function applyTankFilters() {
    const tankOptions = document.querySelectorAll('.tank-option');
    const activeFaction = document.querySelector('.faction-filter-btn.active').getAttribute('data-faction');
    const activeType = document.querySelector('.type-filter-btn.active').getAttribute('data-tank-type');
    
    let visibleCount = 0;
    tankOptions.forEach(option => {
        const tankFaction = option.getAttribute('data-faction');
        const tankType = option.getAttribute('data-tank-type');
        
        const factionMatch = activeFaction === 'all' || tankFaction === activeFaction;
        const typeMatch = activeType === 'all' || tankType === activeType;
        
        if (factionMatch && typeMatch) {
            option.style.display = 'block';
            visibleCount++;
        } else {
            option.style.display = 'none';
        }
    });
    
}

function openScopeView(tankName, updateHash = true) {
    
    const scopeViewer = document.getElementById('scopeViewer');
    const selectedTankName = document.getElementById('selectedTankName');
    const scopeImage = document.getElementById('scopeImage');
    const overlayImage = document.querySelector('.scope-overlay-image');
    const scopeImageContainer = document.querySelector('.scope-image-container');
    
    if (!scopeViewer || !selectedTankName || !scopeImage) {

        return;
    }
    
    // Update tank name
    selectedTankName.textContent = tankName;
    
    // Find the tank in the database to get its directory path and type
    let tankDirectory = '';
    let tankFound = false;
    let tankData = null;
    let tankType = '';
    
    Object.values(tankDatabase).forEach(factionTanks => {
        factionTanks.forEach(tank => {
            if (tank.name === tankName) {
                tankFound = true;
                tankData = tank;
                tankType = tank.type;
                // Extract the directory name from the prefix path
                tankDirectory = tank.images360.prefix.split('/').filter(part => part.length > 0).pop();

            }
        });
    });
    
    if (!tankFound) {

    }
    
    // Set white background for tanks that have scope images (like 8.png or arty_us.png for SPAs)
    const whiteBackground = document.getElementById('whiteBackground');
    if (whiteBackground && tankDirectory) {
        // Check if this is an SPA - all SPAs use arty_us.png
        let scopeImagePath;
        if (tankType === 'SPA (Self Propelled Artillery)') {
            scopeImagePath = 'images/HLL_Icons/Unsorted/Sights_Scopes/arty_us.png';
        } else {
            scopeImagePath = `images/360/${tankDirectory}/8.png`;
        }
        
        const testScopeImg = new Image();
        
        testScopeImg.onload = function () {
            // Tank has a scope image, show white background
            whiteBackground.style.display = 'block';
        };
        
        testScopeImg.onerror = function () {
            // Tank doesn't have a scope image, hide white background
            whiteBackground.style.display = 'none';
        };
        
        // Start testing the scope image
        testScopeImg.src = scopeImagePath;
    } else if (whiteBackground) {
        // No tank directory found, hide white background
        whiteBackground.style.display = 'none';
    }
    
    // Show/hide the ranging overlay based on tank type and specific tank
    if (overlayImage) {
        if (tankName === 'Puma') {
            // Use Puma-specific overlay
            overlayImage.src = 'images/HLL_Icons/pumarananging.png';
            overlayImage.alt = 'Puma Ranging Overlay';
            overlayImage.style.display = 'block';
        } else if (tankName === 'Daimler' || tankName === 'Greyhound') {
            // Use scout vehicle ranging overlay for Daimler and Greyhound
            overlayImage.src = 'images/HLL_Icons/scoutvehicleranging.png';
            overlayImage.alt = 'Scout Vehicle Ranging Overlay';
            overlayImage.style.display = 'block';
        } else if (tankName === 'BA-10 Scout Car') {
            // Use BA-10 specific sight overlay
            overlayImage.src = 'images/HLL_Icons/ba10sight.png';
            overlayImage.alt = 'BA-10 Sight Overlay';
            overlayImage.style.display = 'block';
        } else if (tankName === 'Tetrarch') {
            // Use light tank ranging overlay for Tetrarch
            overlayImage.src = 'images/HLL_Icons/lighttankranging.png';
            overlayImage.alt = 'Light Tank Ranging Overlay';
            overlayImage.style.display = 'block';
        } else if (tankName === 'Luchs') {
            // Use Luchs sight overlay for Luchs
            overlayImage.src = 'images/HLL_Icons/luchssight.png';
            overlayImage.alt = 'Luchs Sight Overlay';
            overlayImage.style.display = 'block';
        } else if (tankName === 'M5A1 Stuart' || tankName === 'M3 Stuart \'Honey\'' || tankName === 'T-70') {
            // Use light tank overlay for specific light tanks
            overlayImage.src = 'images/HLL_Icons/lighttankranging.png';
            overlayImage.alt = 'Light Tank Ranging Overlay';
            overlayImage.style.display = 'block';
        } else if (tankType === 'Heavy Tank' || tankType === 'Medium Tank') {
            // Use default heavy tank overlay
            overlayImage.src = 'images/HLL_Icons/Heavytankranging.png';
            overlayImage.alt = 'Heavy Tank Ranging Overlay';
            overlayImage.style.display = 'block';
        } else {
            overlayImage.style.display = 'none';
        }
    }
    
    // Use 8.png from the tank's directory as the scope view image, or arty_us.png for SPAs
    if (tankDirectory) {
        // Check if this is an SPA - all SPAs use arty_us.png
        let imagePath;
        if (tankType === 'SPA (Self Propelled Artillery)') {
            imagePath = 'images/HLL_Icons/Unsorted/Sights_Scopes/arty_us.png';
        } else {
            imagePath = `images/360/${tankDirectory}/8.png`;
        }
        
        // Test if the image exists by creating a new Image object first
        const testImg = new Image();
        testImg.onload = function () {

            // Now set the actual scope image
            scopeImage.src = imagePath;
            scopeImage.alt = `${tankName} Scope`;

            // Scope opens magnified by default
            scopeImageContainer.classList.add('magnified');
        };
        
        testImg.onerror = function () {

            // Use a simple placeholder instead of non-existent folder
            scopeImage.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIHNjb3BlIGltYWdlIGF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';
            scopeImage.alt = `${tankName} Scope`;
        };
        
        // Start loading the test image
        testImg.src = imagePath;
        
        // Also set up the actual scope image error handling
        scopeImage.onerror = function () {

        };
        
        scopeImage.onload = function () {

        };
    } else {

        // Use a simple placeholder instead of non-existent folder
        scopeImage.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzNzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIHNjb3BlIGltYWdlIGF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';
        scopeImage.alt = `${tankName} Scope`;
    }
    
    // Show scope viewer
    scopeViewer.classList.add('active');

    // Update URL hash with tank name (only if updateHash is true)
    if (updateHash) {
        const tankNameSlug = tankName.toLowerCase().replace(/\s+/g, '-');
        isUpdatingHash = true;
        window.location.hash = `ranging/${tankNameSlug}`;
    }

}

function closeScopeView() {
    const scopeViewer = document.getElementById('scopeViewer');
    const overlayImage = document.querySelector('.scope-overlay-image');
    const scopeImageContainer = document.querySelector('.scope-image-container');
    
    if (scopeViewer) {
        scopeViewer.classList.remove('active');

    }
    
    // Reset overlay visibility when closing
    if (overlayImage) {
        overlayImage.style.display = 'none';
    }
    
    // Reset background when closing
    const whiteBackground = document.getElementById('whiteBackground');
    if (whiteBackground) {
        whiteBackground.style.display = 'none';

    }

    // Reset hash to just ranging section
    isUpdatingHash = true;
    window.location.hash = 'ranging';
}

// Simple magnify function - just toggle the magnified class
function toggleMagnifier() {
    const scopeImageContainer = document.querySelector('.scope-image-container');
    scopeImageContainer.classList.toggle('magnified');
}

// Panning functionality for magnified image
let isPanning = false;
let startX, startY, translateX = 0, translateY = 0;

function startPan(e) {
    if (!document.querySelector('.scope-image-container').classList.contains('magnified')) return;
    
    isPanning = true;
    const scopeImageContainer = document.querySelector('.scope-image-container');
    const expandedTile = scopeImageContainer.closest('.ranging-tool.expanded');
    
    if (!expandedTile) return;
    
    const containerRect = scopeImageContainer.getBoundingClientRect();
    const tileRect = expandedTile.getBoundingClientRect();
    
    startX = (e.clientX || e.touches[0].clientX) - containerRect.left - translateX;
    startY = (e.clientY || e.touches[0].clientY) - containerRect.top - translateY;
    
    document.addEventListener('mousemove', pan);
    // touchmove cannot be passive because we need preventDefault for panning
    document.addEventListener('touchmove', pan, { passive: false });
    document.addEventListener('mouseup', stopPan);
    // touchend cannot be passive because we need to clean up panning state
    document.addEventListener('touchend', stopPan, { passive: false });
}

function pan(e) {
    if (!isPanning) return;
    
    e.preventDefault();
    
    const scopeImageContainer = document.querySelector('.scope-image-container');
    const expandedTile = scopeImageContainer.closest('.ranging-tool.expanded');
    
    if (!expandedTile) return;
    
    const containerRect = scopeImageContainer.getBoundingClientRect();
    const tileRect = expandedTile.getBoundingClientRect();
    const currentX = (e.clientX || e.touches[0].clientX) - containerRect.left;
    const currentY = (e.clientY || e.touches[0].clientY) - containerRect.top;
    
    // Add sensitivity factor to reduce panning speed
    const sensitivity = 0.3;
    translateX = (currentX - startX) * sensitivity;
    translateY = (currentY - startY) * sensitivity;
    
    // Calculate boundaries to keep magnified image within the expanded tile
    // The image is scaled 3x, so we need to account for that in our boundaries
    const imageWidth = containerRect.width;
    const imageHeight = containerRect.height;
    const scaledWidth = imageWidth * 3;
    const scaledHeight = imageHeight * 3;
    
    // Calculate boundaries relative to the expanded tile container
    // We need to ensure the magnified image stays within the tile's content area
    const tileContentArea = expandedTile.querySelector('.expanded-content-layout');
    if (!tileContentArea) return;
    
    const contentRect = tileContentArea.getBoundingClientRect();
    
    // Calculate how much the image can move while staying within the content area
    // The magnified image should not extend beyond the content area boundaries
    const maxTranslateX = Math.max(0, (scaledWidth - contentRect.width) / 2);
    const maxTranslateY = Math.max(0, (scaledHeight - contentRect.height) / 2);
    
    // Apply boundaries to keep image within the content area
    translateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, translateX));
    translateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, translateY));
    
    scopeImageContainer.style.transform = `scale(3) translate(${translateX}px, ${translateY}px)`;
}

function stopPan() {
    isPanning = false;
    document.removeEventListener('mousemove', pan);
    document.removeEventListener('touchmove', pan);
    document.removeEventListener('mouseup', stopPan);
    document.removeEventListener('touchend', stopPan);
}

// Ranging Tool Tile Expansion System
function expandTile(clickedTile, updateHash = true) {
    // Check if we're on mobile (screen width <= 768px)
    const isMobile = window.innerWidth <= 768;

    // Check if this is artillery calculator or armor sights for full-screen mode
    const tileTitle = clickedTile.querySelector('h3');
    const isFullscreenTool = tileTitle && (
        tileTitle.textContent.includes('Artillery Calculator') ||
        tileTitle.textContent.includes('Armor Sights')
    );

    // On mobile, for fullscreen tools, still allow expansion
    if (isMobile && !isFullscreenTool) {
        clickedTile.scrollIntoView({behavior: 'smooth', block: 'start'});
        return;
    }

    // Get all ranging tool tiles
    const allTiles = document.querySelectorAll('.ranging-tool');
    
    // Expand the clicked tile
    clickedTile.classList.add('expanded');
    
    // Show the close button for the expanded tile
    const closeBtn = clickedTile.querySelector('.expand-close-btn');
    if (closeBtn) {
        closeBtn.style.display = 'block';
    }
    
    // Minimize all other tiles
    allTiles.forEach(tile => {
        if (tile !== clickedTile) {
            tile.classList.add('minimized');
        }
    });

    // Enable full-screen mode for artillery calculator and armor sights
    if (isFullscreenTool) {
        document.body.classList.add('fullscreen-mode');
        addFullscreenCloseButton(clickedTile);
        disableNavigationInFullscreen();
    }
    
    // Prevent body scrolling when tile is expanded
    document.body.style.overflow = 'hidden';
    
    // Update URL hash based on which tile was expanded (only if updateHash is true)
    if (updateHash) {
        const tileTitle = clickedTile.querySelector('h3');
        if (tileTitle) {
            const titleText = tileTitle.textContent.trim();
            if (titleText.includes('Artillery Calculator')) {
                isUpdatingHash = true;
                window.location.hash = 'ranging/artillery';
            } else if (titleText.includes('Armor Sights')) {
                isUpdatingHash = true;
                window.location.hash = 'ranging/armor-sights';
            }
        }
    }

}

function closeExpandedTile(closeButton) {
    // Get the expanded tile
    const expandedTile = closeButton.closest('.ranging-tool');
    
    // Remove expanded state
    expandedTile.classList.remove('expanded');
    
    // Hide the close button
    closeButton.style.display = 'none';
    
    // Get all ranging tool tiles
    const allTiles = document.querySelectorAll('.ranging-tool');
    
    // Restore all tiles to normal state
    allTiles.forEach(tile => {
        tile.classList.remove('minimized');
    });
    
    // Restore body scrolling
    document.body.style.overflow = '';
    
    // Reset hash to just ranging section
    isUpdatingHash = true;
    window.location.hash = 'ranging';

}

// Full-screen mode functions
function addFullscreenCloseButton(tile) {
    // Remove any existing fullscreen close button
    const existingBtn = document.querySelector('.fullscreen-close-btn');
    if (existingBtn) {
        existingBtn.remove();
    }

    // Create new fullscreen close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'fullscreen-close-btn';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.title = 'Return to Ranging';
    closeBtn.onclick = () => exitFullscreenMode();

    document.body.appendChild(closeBtn);
}

function exitFullscreenMode() {
    // Remove fullscreen mode class
    document.body.classList.remove('fullscreen-mode');

    // Remove fullscreen close button
    const fullscreenCloseBtn = document.querySelector('.fullscreen-close-btn');
    if (fullscreenCloseBtn) {
        fullscreenCloseBtn.remove();
    }

    // Re-enable navigation
    enableNavigationAfterFullscreen();

    // Close all expanded tiles and return to ranging
    closeAllExpandedTiles();

    // Restore body scrolling
    document.body.style.overflow = '';

    // Navigate back to ranging section
    showSection('ranging');
}

// Disable navigation when in fullscreen mode
function disableNavigationInFullscreen() {
    // Disable all nav links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.style.pointerEvents = 'none';
        link.style.opacity = '0.5';
    });

    // Disable logo click
    const logoContainer = document.querySelector('.logo-container');
    if (logoContainer) {
        logoContainer.style.pointerEvents = 'none';
        logoContainer.style.opacity = '0.5';
    }

    // Disable overview cards
    const overviewCards = document.querySelectorAll('.overview-card');
    overviewCards.forEach(card => {
        card.style.pointerEvents = 'none';
        card.style.opacity = '0.5';
    });
}

// Re-enable navigation when exiting fullscreen mode
function enableNavigationAfterFullscreen() {
    // Re-enable all nav links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.style.pointerEvents = '';
        link.style.opacity = '';
    });

    // Re-enable logo click
    const logoContainer = document.querySelector('.logo-container');
    if (logoContainer) {
        logoContainer.style.pointerEvents = '';
        logoContainer.style.opacity = '';
    }

    // Re-enable overview cards
    const overviewCards = document.querySelectorAll('.overview-card');
    overviewCards.forEach(card => {
        card.style.pointerEvents = '';
        card.style.opacity = '';
    });
}

// Function to close all expanded tiles (for navigation)
function closeAllExpandedTiles() {
    // Exit fullscreen mode if active
    if (document.body.classList.contains('fullscreen-mode')) {
        document.body.classList.remove('fullscreen-mode');
        const fullscreenCloseBtn = document.querySelector('.fullscreen-close-btn');
        if (fullscreenCloseBtn) {
            fullscreenCloseBtn.remove();
        }
        // Re-enable navigation when exiting fullscreen
        enableNavigationAfterFullscreen();
    }

    // Close expanded ranging tool tiles
    const expandedRangingTiles = document.querySelectorAll('.ranging-tool.expanded');
    expandedRangingTiles.forEach(tile => {
        tile.classList.remove('expanded');
        const closeBtn = tile.querySelector('.expand-close-btn');
        if (closeBtn) {
            closeBtn.style.display = 'none';
        }
    });
    
    // Close minimized ranging tool tiles
    const minimizedRangingTiles = document.querySelectorAll('.ranging-tool.minimized');
    minimizedRangingTiles.forEach(tile => {
        tile.classList.remove('minimized');
    });
    
    // Close expanded scope image
    const expandedScopeContainer = document.querySelector('.scope-image-container.expanded');
    if (expandedScopeContainer) {
        expandedScopeContainer.classList.remove('expanded');
        const expandBtn = expandedScopeContainer.querySelector('.scope-expand-btn');
        if (expandBtn) {
            const expandIcon = expandBtn.querySelector('i');
            const expandText = expandBtn.querySelector('span');
            expandIcon.className = 'fas fa-expand-arrows-alt';
            expandText.textContent = 'Expand';
        }
    }
    
    // Close magnified scope image
    const magnifiedScopeContainer = document.querySelector('.scope-image-container.magnified');
    if (magnifiedScopeContainer) {
        magnifiedScopeContainer.classList.remove('magnified');
        const magnifyBtn = magnifiedScopeContainer.querySelector('.scope-magnify-btn');
        if (magnifyBtn) {
            magnifyBtn.style.display = 'none';
            const magnifyIcon = magnifyBtn.querySelector('i');
            const magnifyText = magnifyBtn.querySelector('span');
            magnifyIcon.className = 'fas fa-search-plus';
            magnifyText.textContent = 'Magnify';
        }
        // Remove panning event listeners
        magnifiedScopeContainer.removeEventListener('mousedown', startPan);
        magnifiedScopeContainer.removeEventListener('touchstart', startPan);
    }
    
    // Reset panning variables
    isPanning = false;
    translateX = 0;
    translateY = 0;
    
    // Restore body scrolling
    document.body.style.overflow = '';
}

// Back to Top functionality for expanded Armor Sights
function scrollToTop() {
    
    // When expanded, scroll the expanded tile content to top
    const expandedTile = document.querySelector('.ranging-tool.expanded');
    if (expandedTile) {
        
        // Force scroll to top
        expandedTile.scrollTop = 0;
        
        // Also try scrollTo method as backup
        expandedTile.scrollTo({
            top: 0,
            behavior: 'auto'
        });
        
    } else {

        // Fallback to window scroll if not expanded
        window.scrollTo({
            top: 0,
            behavior: 'auto'
        });
    }
}

// Toggle driving guide section
function toggleDrivingGuide() {
    const content = document.getElementById('drivingGuideContent');
    const icon = document.querySelector('.driving-toggle-icon');
    const text = document.querySelector('.driving-toggle-text');

    if (content.style.display === 'none' || content.style.display === '') {
        content.style.display = 'block';
        icon.textContent = '▲';
        icon.style.transform = 'rotate(180deg)';
        text.textContent = 'less';
    } else {
        content.style.display = 'none';
        icon.textContent = '▼';
        icon.style.transform = 'rotate(0deg)';
        text.textContent = 'more';
    }
}

