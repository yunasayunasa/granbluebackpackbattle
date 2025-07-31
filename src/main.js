// src/main.js

import PreloadScene from './scenes/PreloadScene.js';
import SystemScene from './scenes/SystemScene.js'; 
import UIScene from './scenes/UIScene.js';       
import GameScene from './scenes/GameScene.js';
import SaveLoadScene from './scenes/SaveLoadScene.js';
import ConfigScene from './scenes/ConfigScene.js';
import BacklogScene from './scenes/BacklogScene.js';
import ActionScene from './scenes/ActionScene.js';
import BattleScene from './scenes/BattleScene.js';
import NovelOverlayScene from './scenes/NovelOverlayScene.js';
import RewardScene from './scenes/RewardScene.js'; 
import GameOverScene from './scenes/GameOverScene.js';
import GameClearScene from './scenes/GameClearScene.js';
import ScoreScene from './scenes/ScoreScene.js';
// ★★★ BloomPipelineをimportするのを忘れないでください ★★★
import BloomPipeline from './core/BloomPipeline.js'; 

const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        parent: 'phaser-game',
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1280,
        height: 720
    }, // ★★★ scaleオブジェクトはここで閉じる ★★★

    // ★★★ pipelineは、scaleの外、configの直下に置く ★★★
    pipeline: {
        'Bloom': BloomPipeline
    },

    scene: [
        PreloadScene, 
        SystemScene, 
        UIScene,       
        GameScene,   
        SaveLoadScene, 
        ConfigScene, 
        BacklogScene, 
        ActionScene,
        BattleScene,
        NovelOverlayScene,
        RewardScene,
        GameOverScene,
        GameClearScene,
        ScoreScene
    ]
};

const game = new Phaser.Game(config);