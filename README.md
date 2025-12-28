# AquaPrint 3D - Aquarium Accessories Landing Page

A complete, responsive, static landing page for 3D-printed aquarium accessories.

## Project Structure

```
/project-root
  ├── index.html        # Main landing page
  ├── css/
  │   └── style.css     # Main stylesheet (variables, responsive design)
  ├── js/
  │   └── main.js       # Interaction logic (mobile menu, scroll, form)
  └── assets/
      └── images/       # Product and hero images
```

## How to Run Locally

You can use Python's built-in HTTP server to run the project locally.

1. Open your terminal.
2. Navigate to the project directory:
   ```bash
   cd /Users/hai.doan/Repo/3dshrimp
   ```
3. Start the server:
   ```bash
   python3 -m http.server 8000
   ```
4. Open your browser and go to: `http://localhost:8000`

## How to Deploy to Netlify

1. **Push to GitHub**:

   - Initialize a git repository: `git init`
   - Add files: `git add .`
   - Commit: `git commit -m "Initial commit"`
   - Push to a new GitHub repository.

2. **Connect to Netlify**:

   - Log in to [Netlify](https://www.netlify.com/).
   - Click **"Add new site"** > **"Import from an existing project"**.
   - Select **GitHub**.
   - Choose your `3dshrimp` repository.

3. **Configure Build**:
   - **Build command**: (Leave empty, this is a static site)
   - **Publish directory**: `.` (Current directory)
   - Click **"Deploy site"**.

## Features

- **Responsive Design**: Works on mobile, tablet, and desktop.
- **Scroll Animations**: Elements fade in as you scroll.
- **Smooth Navigation**: Clicking links scrolls smoothly to the section.
- **Mobile Menu**: Hamburger menu for smaller screens.
- **Contact Form**: Simulation of a working contact form with validation.

## Technologies

- HTML5 (Semantic)
- CSS3 (Variables, Flexbox, Grid, Animations)
- Vanilla JavaScript (ES6+)
- Font Awesome (Icons)
- Google Fonts (Inter, Playfair Display)

---

© 2025 AquaPrint 3D
# aquaprint3d
# aquaprint3d
