---
name: Landing Page Visualizer
description: Analyzes landing page code to recommend, style, and generate tailored visual assets (icons, illustrations, and backgrounds) based on brand themes.
---

# Landing Page Visualizer Skill

## 🎯 Purpose
This skill equips the agent to act as an Art Director, UX Analyst, and Prompt Engineer for landing pages. It reads the user's existing landing page code to identify where visual assets (illustrations, icons, and section backgrounds) are needed. It then standardizes a visual theme based on user preferences and either generates the images directly or provides highly optimized prompts for any AI image generation tool.

## 🛠️ Step-by-Step Execution Workflow

### Phase 1: Context & Code Analysis
1. Ask the user for the path to their landing page code (HTML, React, Next.js, etc.) and any existing brand guidelines (`brand.md`, colors, fonts).
2. Read the landing page code to analyze the structure. Identity:
   - **Hero Sections:** Needs wide background images or right-aligned 3D hero illustrations.
   - **Benefit/Feature Cards:** Needs isolated, transparent-style icons or illustrations to place next to text.
   - **Backgrounds:** Needs subtle gradients, patterns, or image overlays for specific `<section>` tags.
3. Determine the current missing media assets.

### Phase 2: Theme Suggestion & Selection
Before generating any prompts, suggest 4-5 modern design themes from the `resources/themes.md` file based on the brand context. 
- Ask the user to pick one, or provide their own. 
- Ask which AI tool they are targeting for generation (e.g., Built-in Agent Generator, Midjourney, DALL-E 3, Stable Diffusion) so you can adapt the prompt syntax.

### Phase 3: Planning The Visuals
Create a markdown table grouping the needed visuals so the user can review the plan:
| Section | Element Type | Description | Targeted Theme Application |
|---------|--------------|-------------|----------------------------|
| Hero    | Background   | Abstract... | ...                        |
| Feature | Isolated     | ...         | ...                        |

### Phase 4: Prompt Construction
Construct prompts using the formulas provided in `resources/prompt_formulas.md`. 
- **For 'Isolated / No Background' assets:** Ensure you heavily emphasize pure solid white/black backgrounds or use specific vector/die-cut terms so the user can easily key out the background later (or blend it via CSS).
- **For Section Backgrounds:** Ensure prompts include phrases like "empty negative space", "subtle", or "ultra-wide".

### Phase 5: Execution Output
- **If Manual Mode:** Output the formatted, tool-specific prompts in code blocks so the user can easily copy and paste them.
- **If Auto Mode:** Use your built-in `generate_image` tool using the constructed prompts, save them to the project directory, and offer to automatically update the landing page code with the new image file paths!

### Phase 6: Self-Improvement (After Every Session)
After generating prompts and receiving user feedback or final images, **always update this skill** to improve over time:

1. **New Style Discovery:** If the user provided a reference image or requested a style that doesn't match any existing theme in `resources/themes.md`, create a new numbered theme entry with:
   - Keywords, color palette, style details
   - Best-for use cases
   - A reusable prompt template
   - Proven examples from this session (what worked)

2. **Prompt Refinement:** If the user iterated on prompts or gave feedback on generated images (e.g., "too busy", "wrong colors", "not glossy enough"), update the relevant theme's style details or prompt template with the corrected language.

3. **Prompt Formula Updates:** If a new AI tool syntax was discovered or an existing formula produced poor results, update `resources/prompt_formulas.md` with the improved version.

4. **Pattern Logging:** Add successful prompt-to-result pairs under "Proven examples" in the relevant theme so future sessions can reference what actually worked.

This ensures the skill becomes more accurate and tailored to the project's visual identity with every use. The themes file is the skill's long-term memory — treat it as a living document.
