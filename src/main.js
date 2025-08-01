// src/main.js (直接クラス渡し形式での最終修正 - ステップ1-1)

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
import BloomPipeline from './core/BloomPipeline.js'; 
import RankMatchBattleScene from './scenes/RankMatchBattleScene.js';
import MatchingScene from './scenes/MatchingScene.js';

const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        parent: 'phaser-game',
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1280,
        height: 720
        
    },
      pipeline: {
        'Bloom': BloomPipeline
    },
    // ★★★ 修正箇所: シーン設定を直接クラスを渡す形式に維持 ★★★
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
        RewardScene ,
         GameOverScene,  // ★追加
        GameClearScene,
        ScoreScene,
        MatchingScene, 
        RankMatchBattleScene // ★追加
    ]
};

const game = new Phaser.Game(config);