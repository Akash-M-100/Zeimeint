# Zeminent Agency Website

A pixel-perfect, highly responsive, and interactive website built with React and Tailwind CSS, designed to replicate the Figma design with modern animations and premium feel.

## 🚀 Features

- **Pixel-Perfect Design**: Faithful recreation of the Figma design
- **Responsive Layout**: Optimized for Desktop, Tablet, and Mobile
- **Modern Animations**: Smooth transitions and hover effects using Framer Motion
- **Component-Based Architecture**: Modular React components
- **Premium UI/UX**: Gradient backgrounds, soft glows, and modern styling
- **Performance Optimized**: Fast loading and smooth interactions

## 📱 Pages

### Landing Page
- **Header/Navbar**: Logo, navigation links, and CTA button with scroll blur effect
- **Hero Section**: Animated gradient background with floating elements and statistics
- **Services Section**: Four service cards with hover animations and detailed features
- **Why Choose Zeminent**: Three main value propositions with additional benefits
- **CTA Section**: Gradient background with animated elements and trust indicators
- **Footer**: Comprehensive links, contact info, and social media

### About Us Page
- **Hero Section**: Mission and vision cards with company overview
- **Core Values**: Four value cards with icons and descriptions
- **Leadership Team**: Three team member cards with profile placeholders
- **Final CTA**: Collaboration-focused call-to-action

## 🎨 Design System

### Colors
- **Primary Gradient**: `#4D00FF → #0A00B6 → #7C00FF`
- **Accent**: `#A259FF`
- **Background**: Dark violet-black gradient (`#0D0A15`, `#1a1a2e`, `#16213e`)
- **Text**: White (`#FFFFFF`) and light gray (`#CCCCCC`)

### Typography
- **Font**: Poppins (primary) and Inter (fallback)
- **Headings**: Bold weights with gradient text effects
- **Body**: Medium weight with proper line spacing

### Effects
- **Soft Violet Glow**: Applied to cards, buttons, and key elements
- **Gradient Borders**: Subtle purple borders with hover effects
- **Backdrop Blur**: For navbar and overlay elements
- **Smooth Animations**: CSS transitions and Framer Motion

## 🛠️ Tech Stack

- **React 18**: Modern React with hooks and functional components
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework with custom configuration
- **Framer Motion**: Advanced animations and transitions
- **React Router**: Client-side routing
- **Lucide React**: Modern icon library

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

3. **Open your browser**
   Navigate to `http://localhost:3003`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## 📁 Project Structure

```
src/
├── components/          # Reusable React components
│   ├── Navbar.jsx      # Navigation header with scroll effects
│   ├── Hero.jsx        # Landing page hero section
│   ├── Services.jsx    # Services grid with cards
│   ├── WhyChoose.jsx   # Value propositions section
│   ├── CTA.jsx         # Call-to-action component
│   └── Footer.jsx      # Footer with links and contact info
├── pages/              # Page components
│   ├── Home.jsx        # Landing page
│   └── About.jsx       # About us page
├── App.jsx             # Main app component with routing
├── main.jsx            # React entry point
└── index.css           # Global styles and Tailwind imports

images/                 # Static assets
├── Logo.svg           # Company logo
├── *.svg             # Service and social media icons
└── team/             # Team member images (placeholder)
```

## 🎯 Key Components

### Navbar
- Fixed position with scroll blur effect
- Responsive mobile menu with animations
- Smooth navigation with React Router

### Hero Section
- Animated gradient background
- Floating particle effects
- Statistics counter animations
- Scroll indicator

### Services Cards
- Hover animations with scale and glow effects
- Feature lists with bullet points
- Gradient borders and backgrounds

### CTA Sections
- Gradient backgrounds with animated elements
- Multiple call-to-action buttons
- Trust indicators and statistics

## 📱 Responsive Design

- **Mobile First**: Optimized for mobile devices
- **Breakpoints**: 
  - Mobile: < 768px
  - Tablet: 768px - 1024px
  - Desktop: > 1024px
- **Navigation**: Hamburger menu on mobile
- **Grid Layouts**: Responsive grid systems
- **Typography**: Scalable font sizes

## ⚡ Performance Features

- **Code Splitting**: Automatic route-based code splitting
- **Image Optimization**: Optimized SVG icons and images
- **Lazy Loading**: Components loaded on demand
- **Smooth Animations**: Hardware-accelerated CSS transforms
- **Minimal Bundle**: Tree-shaking and dead code elimination

## 🔧 Customization

### Colors
Edit `tailwind.config.js` to modify the color palette:

```javascript
colors: {
  primary: { /* Primary color scale */ },
  violet: { /* Violet color scale */ },
  dark: { /* Dark background colors */ }
}
```

### Animations
Modify animations in `tailwind.config.js`:

```javascript
animation: {
  'float': 'float 6s ease-in-out infinite',
  'glow': 'glow 2s ease-in-out infinite alternate',
  // Add custom animations
}
```

### Components
All components are modular and can be easily customized:
- Update content in component files
- Modify styling with Tailwind classes
- Add new animations with Framer Motion

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please ensure you:
1. Make your changes
2. Test thoroughly
3. Document any new features

## 📞 Support

For support and questions:
- Email: maya@zeminent.com
- Phone: +91-9032475086

---

Built with ❤️ by the Zeminent Team
