# Socionics Wiki

A comprehensive wiki about socionics built with Astro and Starlight, automatically deployed to GitHub Pages.

## 🚀 Project Structure

```
.
├── public/
├── src/
│   ├── assets/
│   ├── content/
│   │   └── docs/
│   │       ├── types/      # Personality types content
│   │       ├── concepts/   # Core concepts
│   │       └── relations/  # Intertype relations
│   └── content.config.ts
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions workflow
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

## 📝 Adding Content

Add new content by creating `.md` or `.mdx` files in the `src/content/docs/` directory:

- **Types**: Add personality type descriptions in `src/content/docs/types/`
- **Concepts**: Add socionic concepts in `src/content/docs/concepts/`
- **Relations**: Add intertype relations in `src/content/docs/relations/`

Each file is automatically exposed as a route based on its file name.

## 🧞 Local Development

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |

## 🌐 Deployment to GitHub Pages

This project is configured for automatic deployment to GitHub Pages. The deployment workflow runs automatically when you push to the `main` branch.

### Setup Instructions

1. **Push your code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/sergeshaneri/socionics-wiki.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**:
   - Go to your repository on GitHub
   - Navigate to **Settings** > **Pages**
   - Under **Source**, select **GitHub Actions**
   - Save the settings

3. **Automatic Deployment**:
   - Every push to the `main` branch will automatically trigger a build and deployment
   - Your site will be available at: `https://sergeshaneri.github.io/socionics-wiki`

### Manual Deployment

You can also trigger a deployment manually:
- Go to **Actions** tab in your repository
- Select **Deploy to GitHub Pages** workflow
- Click **Run workflow** > **Run workflow**

## 🎨 Customization

- **Site configuration**: Edit `astro.config.mjs` to change the title, sidebar, and other settings
- **Theme**: The project uses Starlight with the Obsidian theme
- **Styling**: Starlight provides built-in styling that can be customized

## 📚 Resources

- [Starlight Documentation](https://starlight.astro.build/)
- [Astro Documentation](https://docs.astro.build)
- [Socionics Theory](https://en.wikipedia.org/wiki/Socionics)
