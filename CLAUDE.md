<!-- vance-managed -->
# Soul Jam

2D arcade basketball game built with Phaser 3, TypeScript and Vite

## Stack
- **Framework**: vite
- **Language**: TypeScript
- **Testing**: Vitest
- **Key Dependencies**: phaser

## Commands
- **dev**: `npm run dev`
- **build**: `npm run build`
- **test**: `npm test`

## Architecture
```
├── assets/
│   ├── audio/
│   └── images/
├── public/
│   ├── assets/
│   │   ├── audio/
│   │   └── images/
│   └── style.css
├── src/
│   ├── ai/
│   │   ├── AIController.ts
│   │   └── AIPersonality.ts
│   ├── config/
│   │   ├── Constants.ts
│   │   └── GameConfig.ts
│   ├── data/
│   │   ├── skins/
│   │   ├── CharacterRatings.ts
│   │   ├── Characters.ts
│   │   ├── courts.ts
│   │   ├── match.ts
│   │   ├── theme.ts
│   │   └── types.ts
│   ├── input/
│   │   ├── CompositeInputProvider.ts
│   │   ├── GamepadInputProvider.ts
│   │   ├── InputManager.ts
│   │   ├── InputProvider.ts
│   │   ├── IPlayerInput.ts
│   │   ├── KeyboardInputProvider.ts
│   │   └── NullInputProvider.ts
│   ├── rendering/
│   │   ├── AnimationLoader.ts
│   │   ├── BallRenderer.ts
│   │   ├── CardRenderer.ts
│   │   ├── CourtRenderer.ts
│   │   ├── HoopRenderer.ts
│   │   ├── HUDRenderer.ts
│   │   ├── PlayerRenderer.ts
│   │   ├── ScreenBackgroundRenderer.ts
│   │   └── slotUtils.ts
│   ├── scenes/
│   │   ├── BootScene.ts
│   │   ├── CharacterSelectScene.ts
│   │   ├── CourtSelectScene.ts
│   │   ├── GameScene.ts
│   │   ├── LeaderboardScene.ts
│   │   ├── MenuScene.ts
│   │   ├── PauseScene.ts
│   │   ├── PreloadScene.ts
│   │   └── ResultScene.ts
│   ├── services/
│   │   ├── AssetRegistry.ts
│   │   ├── FirebaseService.ts
│   │   ├── IAuthService.ts
│   │   ├── IDataService.ts
│   │   ├── LocalStorageService.ts
│   │   └── StorageService.ts
│   ├── simulation/
│   │   ├── models/
... (truncated)
```

## Key Files
- `src/main.ts`
- `vite.config.ts`
- `tsconfig.json`

## Recent Activity
- 6742b38 Refactor visual layer to asset-slot driven SkinBundle architecture
- c98f2db Add vertical slice: court select, result screen, leaderboard, unlock system
- f0da983 Add loading screen text: you are agenius
- 1fa7dd9 Add character 99 animation config + Breezy grid sheet
- acb0b36 Ball handler always faces hoop, Square = shoot/steal by context
- 6d1e2ac Add full gamepad/controller support for all scenes
- 5b1ffff Defender always faces offense player regardless of stance
- ac07a13 Ball handler faces defender when driving, crossover matches movement duration
- ed6d916 Fix crossover animation timing, always show defense anims without ball
- b466ab6 Fix defense animations: backpedal/shuffle/static/steal properly mapped

## Rules
- Work autonomously. Commit frequently. Do NOT push unless told to.
- Read files before editing. Run tests after changes.
- npm cache has permissions issues — use `--cache ./.npm-cache` flag when installing.
