// src/handlers/index.js (完成版)

// --- 表示・演出系 ---
import { handleFlash } from './flash.js';
import { handleHideWindow } from './hidewindow.js';
import { handleShowWindow } from './showwindow.js';
import { handleCharaShow } from './chara_show.js';
import { handleCharaHide } from './chara_hide.js';
import { handleCharaMod } from './chara_mod.js';
import { handleBg } from './bg.js';
import { handleImage } from './image.js';
import { handleFreeImage } from './freeimage.js';
import { handleMove } from './move.js';
import { handleWalk } from './walk.js';
import { handleShake } from './shake.js';
import { handleVibrate } from './vibrate.js';
import { handleFlip } from './flip.js';
import { handleCharaJump } from './chara_jump.js';
import { handleStopAnim } from './stop_anim.js';
import { handleFadeout } from './fadeout.js';
import { handleFadein } from './fadein.js';
import { handleVideo } from './video.js';
import { handleStopVideo } from './stopvideo.js';

// --- 音声系 ---
import { handlePlaySe } from './playse.js';
import { handlePlayBgm } from './playbgm.js';
import { handleStopBgm } from './stopbgm.js';
import { handleVoice } from './voice.js';

// --- ゲームロジック・変数操作系 ---
import { handleEval } from './eval.js';
import { handleIf } from './if.js';
import { handleElsif } from './elsif.js';
import { handleElse } from './else.js';
import { handleEndif } from './endif.js';
import { handleLog } from './log.js';

// --- フロー制御・待機系 ---
import { handlePageBreak } from './p.js';
import { handleWait } from './wait.js';
import { handleStop } from './s.js';
import { handleDelay } from './delay.js';

// --- UI・インタラクション系 ---
import { handleClearMessage } from './cm.js';
import { handleErase } from './er.js'; // cmの別名？
import { handleLink } from './link.js';
import { handleButton } from './button.js';

// --- シーン・サブルーチン遷移系 ---
import { handleJump } from './jump.js';
import { handleCall } from './call.js';
import { handleReturn } from './return.js';


// タグ名と関数をマッピングしたオブジェクトをエクスポート
export const tagHandlers = {
    // 表示・演出系
  'flash': handleFlash,
    'hidewindow': handleHideWindow,
    'showwindow': handleShowWindow,
    'chara_show': handleCharaShow,
    'chara_hide': handleCharaHide,
    'chara_mod': handleCharaMod,
    'bg': handleBg,
    'image': handleImage,
    'freeimage': handleFreeImage,
    'move': handleMove,
    'walk': handleWalk,
    'shake': handleShake,
    'vibrate': handleVibrate,
    'flip': handleFlip,
    'chara_jump': handleCharaJump,
    'stop_anim': handleStopAnim,
    'fadeout': handleFadeout,
    'fadein': handleFadein,
    'video': handleVideo,
    'stopvideo': handleStopVideo,

    // 音声系
    'playse': handlePlaySe,
    'playbgm': handlePlayBgm,
    'stopbgm': handleStopBgm,
    'voice': handleVoice,

    // ゲームロジック・変数操作系
    'eval': handleEval,
    'if': handleIf,
    'elsif': handleElsif,
    'else': handleElse,
    'endif': handleEndif,
    'log': handleLog,

    // フロー制御・待機系
    'p': handlePageBreak,
    'wait': handleWait,
    's': handleStop,
    'delay': handleDelay,
    
    // UI・インタラクション系
    'cm': handleClearMessage,
    'er': handleErase,
    'link': handleLink,
    'button': handleButton,
    
    // シーン・サブルーチン遷移系
    'jump': handleJump,
    'call': handleCall,
    'return': handleReturn,
};
