# Frontline Push

Frontline Push is currently implemented as a dependency-free static web prototype. The game blueprint lives in a normal web project structure, so you do not paste all of the code into one file.

## Where the code goes

- `index.html` is the browser entry point. It creates the `#root` element and loads the stylesheet and JavaScript module.
- `src/main.js` contains the Frontline Push page content and rendering logic.
- `src/styles.css` contains the visual styling and responsive layout.
- `package.json` contains the convenience commands for checking and serving the prototype.

If you are recreating this project somewhere else, make a folder, then place each file at the same relative path shown above.

## How to play or preview it locally

This version is a playable/previewable browser prototype page, not a full multiplayer shooter executable yet. To open it locally:

1. Install Node.js if you want to use the syntax-check command.
2. From the project folder, run:

   ```bash
   npm test
   ```

3. Start the local web server:

   ```bash
   npm start
   ```

4. Open this URL in your browser:

   ```text
   http://127.0.0.1:4173
   ```

You can also run the server directly without npm:

```bash
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173`.

## Turning this into an actual game

To make Frontline Push fully playable as a 12v12 shooter, this blueprint would need to be implemented in a game engine such as Unity, Unreal Engine, Godot, or a browser game stack with networking. The current files are best used as the design presentation and front-end prototype for those mechanics.
