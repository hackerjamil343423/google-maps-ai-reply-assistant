# Prompt Formulas & AI Tool Adaptations

Adjust the prompt structure based on the user's targeted AI model. You must read the user's tool preference before generating prompts.

## 1. Handling "No Background" / Isolated Assets for UI Cards
AI struggles with producing true perfect transparency (PNGs). To get an image that can be easily keyed out, use these extreme isolation modifiers:
- **Midjourney/Stable Diffusion:** `...shot against a pure solid white background, die-cut vector style, isolated object, completely detached, no shadows on background --no background noise, gradients, floors`
- **DALL-E 3 / Built-in:** `...make sure the background is perfectly solid white, with no cast shadows, so the object is completely isolated and floating.`

## 2. Handling "Backgrounds & Containers"
To generate images that text will sit on top of (like Hero headers or Feature wrap sections):
- **Hero Backgrounds:** `...abstract background, minimal, clean negative space in the center, unobtrusive, soft gradients, ultra wide angle --ar 16:9` (or `21:9` for ultra wide headers).
- **Pattern Container Backgrounds:** `...seamless repeating pattern, subtle, low contrast watermark style, UI background, desaturated.`

## 3. Tool-Specific Syntaxes

### Midjourney V6 Syntax
`[Subject/Action] + [Environment/Background] + [Theme/Style Keywords] + [Lighting/Render Engine] + --ar [aspect ratio] --stylize [100-300] --v 6.0`
*Example:* `A 3D isometric rocket launching, solid white background, soft clay render, pastel colors, octane render, modern UI asset --ar 1:1 --stylize 200 --v 6.0`

### DALL-E 3 / Automatic Generator Syntax
Be highly descriptive, conversational, and explicit about constraints.
*Example:* `A flat vector illustration of a fast rocket. The background MUST be pure solid white with absolute zero background noise or gradients. Use a minimalist geometric style with vibrant colors, no outlines. Keep it clean and modern for a website feature card.`

### Stable Diffusion XL Syntax
Focus strongly on positive and negative prompts.
*Positive:* `Isometric 3d rocket, claymation style, pastel, pure white background, masterpiece, UI asset.`
*Negative:* `dark background, busy, text, watermark, bad anatomy, drop shadow.`
