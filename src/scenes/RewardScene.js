// src/scenes/RewardScene.js

import { ITEM_DATA } from '../core/ItemData.js';

import Tooltip from '../ui/Tooltip.js';


const ELEMENT_COLORS = {
    fire: 0xff4d4d, wind: 0x4dff4d, earth: 0xffaa4d, water: 0x4d4dff, light: 0xffff4d, dark: 0xaa4dff
};
const TOOLTIP_TRANSLATIONS = {
    up: '上', down: '下', left: '左', right: '右', adjacent: '隣接', horizontal: '左右', vertical: '上下',
    up_and_sides: '上と左右', fire: '火', water: '水', earth: '土', wind: '風', light: '光', dark: '闇',
    weapon: '武器', support: '支援', healer: '回復', defense: '防御', add_attack: '攻撃力', add_recast: 'リキャスト',
    'add_block_on_activate': '起動時ブロック', 'heal_on_activate': '起動時回復', 'add_heal_power': '回復効果'
};
const ELEMENT_RESONANCE_RULES = {
    fire: { threshold: 3, description: (count) => `攻撃力+${Math.floor(count / 2)}` },
    wind: { threshold: 3, description: (count) => `リキャスト-${(0.2 * (count - 2)).toFixed(1)}s` },
    earth: { threshold: 3, description: (count) => `ブロック効果+${count * 2}` },
    light: { threshold: 3, description: (count) => `回復効果+${count * 2}` },
    water: { threshold: 3, description: (count) => `シナジー効果+${count - 2}` },
    dark:  { threshold: 3, description: (count) => `背水効果(小)` }
};

export default class RewardScene extends Phaser.Scene {
    constructor() {
        super('RewardScene');
        this.stateManager = null;
        this.soundManager = null;
        this.returnSceneKey = 'BattleScene'; // デフォルトの戻り先
    }

    init(data) {
        console.log("RewardScene: init", data);
        // ★★★ data.params.returnTo を参照する ★★★
        if (data && data.transitionParams && data.transitionParams.returnTo) {
            this.returnSceneKey = data.transitionParams.returnTo;
            console.log(`次の戻り先シーンを設定: ${this.returnSceneKey}`);
        } else {
            // もしreturnToが渡されなかった場合、安全のためにデフォルト値に戻す
            this.returnSceneKey = 'BattleScene';
        }
    }
        create() {
        this.cameras.main.fadeIn(300, 0, 0, 0); 
        this.stateManager = this.sys.registry.get('stateManager');
        this.soundManager = this.sys.registry.get('soundManager');
        this.tooltip = new Tooltip(this);
        try { this.soundManager.playBgm('bgm_prepare'); } catch(e) {}
        
        this.add.image(this.scale.width / 2, this.scale.height / 2, 'reward_background')
            .setDisplaySize(this.scale.width, this.scale.height).setDepth(-1);

        this.add.text(this.scale.width / 2, 100, '報酬を選択', { fontSize: '48px', fill: '#ecf0f1' }).setOrigin(0.5);

        const rewardPool = Object.keys(ITEM_DATA).filter(id => !['sword', 'shield', 'potion'].includes(id));
        const selectedRewards = [];
        const rewardCount = Math.min(3, rewardPool.length); 
        for (let i = 0; i < rewardCount; i++) {
            const randomIndex = Phaser.Math.Between(0, rewardPool.length - 1);
            selectedRewards.push(rewardPool.splice(randomIndex, 1)[0]);
        }

        selectedRewards.forEach((itemId, index) => {
            const x = (this.scale.width / 4) * (index + 1);
            const y = this.scale.height / 2;
            const itemData = ITEM_DATA[itemId];

            const card = this.add.rectangle(x, y, 150, 220, 0xbdc3c7);
            card.setStrokeStyle(4, 0x7f8c8d);

            let itemImage; // on('pointerdown') の外でも参照できるように
            if (itemData && itemData.storage) {
                itemImage = this.add.image(x, y - 30, itemData.storage).setInteractive();
                const scale = Math.min(120 / itemImage.width, 120 / itemImage.height);
                itemImage.setScale(scale);

                itemImage.on('pointerdown', (pointer, localX, localY, event) => {
                    // ★★★ pointer ではなく event を使う ★★★
                    event.stopPropagation();

                    const t = (key) => TOOLTIP_TRANSLATIONS[key] || key;
                    let tooltipText = `【${itemId}】\n`;
                    const itemElements = itemData.tags.filter(tag => ELEMENT_RESONANCE_RULES[tag]);
                    if (itemElements.length > 0) { tooltipText += `属性: [${itemElements.map(el => t(el)).join(', ')}]\n`; }
                    const sizeH = itemData.shape.length;
                    const sizeW = itemData.shape[0].length;
                    tooltipText += `サイズ: ${sizeH} x ${sizeW}\n\n`;
                    if (itemData.recast) { tooltipText += `リキャスト: ${itemData.recast.toFixed(1)}秒\n`; }
                    if (itemData.action) {
                        const actions = Array.isArray(itemData.action) ? itemData.action : [itemData.action];
                        actions.forEach(action => { tooltipText += `効果: ${t(action.type)} ${action.value}\n`; });
                    }
                    if (itemData.passive && itemData.passive.effects) {
                        itemData.passive.effects.forEach(e => { tooltipText += `パッシブ: ${t(e.type)} +${e.value}\n`; });
                    }
                    if (itemData.synergy) {
                        tooltipText += `\nシナジー:\n`;
                        const dir = t(itemData.synergy.direction);
                        const effects = Array.isArray(itemData.synergy.effect) ? itemData.synergy.effect : [itemData.synergy.effect];
                        tooltipText += `  - ${dir}の味方に\n`;
                        effects.forEach(effect => {
                            const effectType = t(effect.type);
                            const sign = effect.value >= 0 ? '+' : '';
                            tooltipText += `    効果: ${effectType} ${sign}${effect.value}\n`;
                        });
                    }
                    this.tooltip.show(itemImage, tooltipText);
                }); // ★★★ 抜けていた `)` を追加 ★★★
            } // ★ if文の閉じ括弧

            this.add.text(x, y + 50, itemId, {
                fontSize: '20px', fill: '#2c3e50'
            }).setOrigin(0.5);

            const buttonBg = this.add.rectangle(x, y + 95, 120, 40, 0x27ae60).setInteractive();
            buttonBg.setStrokeStyle(2, 0xffffff);
            this.add.text(x, y + 95, '獲得', {
                fontSize: '24px', fill: '#fff', stroke: '#000', strokeThickness: 2
            }).setOrigin(0.5);

            buttonBg.on('pointerdown', () => {
                card.setAlpha(0.5);
                if(itemImage) itemImage.disableInteractive(); // itemImageが存在すれば無効化
                buttonBg.disableInteractive();
                
                this.selectReward(itemId);
            });
        });
        
        this.input.on('pointerdown', () => {
            if (this.tooltip && this.tooltip.visible) {
                this.tooltip.hide();
            }
        });

        this.events.emit('scene-ready');
    }

    selectReward(selectedItemId) {
        console.log(`報酬として ${selectedItemId} を選択しました`);

        const currentInventory = this.stateManager.sf.player_inventory || [];
        const newInventory = [...currentInventory, selectedItemId];
        this.stateManager.setSF('player_inventory', newInventory);

        // フェードアウトしてから、記憶しておいたシーンキーを使って戻る
        this.cameras.main.fadeOut(300, 0, 0, 0, (camera, progress) => {
            if (progress === 1) {
               this.scene.get('SystemScene').events.emit('request-scene-transition', {
                    to: this.returnSceneKey,
                    from: this.scene.key
                });
            }
        });
    }
}