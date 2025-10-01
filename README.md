# Hell Let Loose Armor Hub

A comprehensive web resource for Hell Let Loose players to master tank warfare, featuring detailed information about all tanks, penetration mechanics, ranging guides, and identification practice.

## Features

### 🎯 **Complete Tank Database**
- **15+ tanks** from all three factions (USA, Germany, Soviet Union)
- Detailed specifications including armor, guns, speed, and crew
- Faction-based filtering system
- Visual tank cards with key statistics

### 🛡️ **Armor Penetration Guide**
- Comprehensive penetration chart for all tank weapons
- Range and effectiveness data
- Strategic tips for targeting weak spots
- Interactive table with hover effects

### 🎯 **Ranging Calculator**
- Distance-based ranging tool for different tank types
- Accuracy predictions and recommendations
- Support for Light, Medium, and Heavy tanks
- Real-time calculations and feedback

### 🔍 **Tank Identification Practice**
- Interactive identification training
- Random tank selection with multiple choice
- Immediate feedback and educational information
- Progressive difficulty system

### 🌙 **Dark/Light Mode Toggle**
- Seamless theme switching
- Persistent theme preference (saved to localStorage)
- Military-inspired color schemes
- High contrast for optimal readability

### 📱 **Responsive Design**
- Mobile-first approach
- Optimized for all screen sizes
- Touch-friendly interface
- Adaptive navigation system

## Technical Specifications

### **Frontend Technologies**
- **HTML5** - Semantic markup and accessibility
- **CSS3** - Modern styling with CSS Grid and Flexbox
- **JavaScript (ES6+)** - Interactive functionality and data management
- **Font Awesome** - Icon library for visual elements
- **Google Fonts** - Military-style typography (Orbitron, Exo 2)

### **Design System**
- **Color Scheme**: Black and red military theme
- **Typography**: Orbitron (headings) and Exo 2 (body text)
- **Layout**: CSS Grid and Flexbox for responsive design
- **Animations**: Smooth transitions and hover effects

### **Browser Support**
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## File Structure

```
hell-let-loose-armor-hub/
├── index.html          # Main HTML file
├── styles.css          # CSS styles and theme system
├── script.js           # JavaScript functionality
└── README.md           # Project documentation
```

## Getting Started

### **Local Development**
1. Clone or download the project files
2. Open `index.html` in a modern web browser
3. No build process or dependencies required

### **Deployment**
- Upload all files to any web hosting service
- Compatible with GitHub Pages, Netlify, Vercel, etc.
- No server-side requirements

## Data Structure

### **Tank Database**
Each tank object contains:
```javascript
{
    name: "Tank Name",
    type: "Light/Medium/Heavy Tank",
    faction: "USA/Germany/Soviet Union",
    armor: "Front/Sides/Rear specifications",
    gun: "Main armament",
    penetration: "Penetration values",
    speed: "Maximum speed",
    crew: "Number of crew members",
    description: "Detailed description",
    weakSpots: "Vulnerable areas",
    strengths: "Key advantages",
    icon: "Font Awesome icon class"
}
```

### **Penetration Data**
Weapon effectiveness data including:
- Weapon name and type
- Effective range
- Penetration values
- Target effectiveness

### **Ranging System**
Tank-specific ranging data:
- Base range for optimal accuracy
- Maximum effective range
- Accuracy characteristics
- Dropoff patterns

## Customization

### **Adding New Tanks**
1. Locate the `tankDatabase` object in `script.js`
2. Add new tank data following the existing structure
3. Include all required fields for proper display

### **Modifying Themes**
1. Edit CSS variables in `styles.css`
2. Update color schemes in `:root` selectors
3. Maintain contrast ratios for accessibility

### **Extending Functionality**
- Modular JavaScript architecture
- Separated concerns for easy maintenance
- Event-driven interactions
- Error handling for robustness

## Performance Features

- **Lazy Loading**: Content loads as needed
- **Optimized Animations**: Hardware-accelerated CSS transitions
- **Efficient DOM Manipulation**: Minimal reflows and repaints
- **Memory Management**: Proper event listener cleanup

## Accessibility

- **Semantic HTML**: Proper heading hierarchy and landmarks
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Compatible**: ARIA labels and descriptions
- **High Contrast**: Meets WCAG guidelines
- **Responsive Text**: Scalable typography

## Future Enhancements

### **Planned Features**
- [ ] Tank comparison tool
- [ ] Interactive 3D tank models
- [ ] Advanced penetration calculator
- [ ] User accounts and progress tracking
- [ ] Community features and tips sharing

### **Technical Improvements**
- [ ] Progressive Web App (PWA) capabilities
- [ ] Offline functionality
- [ ] Advanced caching strategies
- [ ] Performance optimizations

## Contributing

This project is designed for easy maintenance and updates. When making changes:

1. **Preserve Existing Functionality**: All current features must continue working
2. **Follow Code Style**: Maintain consistent formatting and naming conventions
3. **Test Responsiveness**: Ensure mobile compatibility
4. **Update Documentation**: Keep README current with changes

## License

This project is created for educational and entertainment purposes. All game-related content belongs to their respective owners.

## Support

For questions or suggestions about the website functionality, please refer to the code comments and documentation within the files.

---

**Built with ❤️ for the Hell Let Loose community**
