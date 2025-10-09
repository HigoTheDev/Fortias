// File: UIManager.ts
import { _decorator, Component, Label, Node, UIOpacity, tween } from 'cc';
import { CardSelectionManager } from './CardSelectionManager';

const { ccclass, property } = _decorator;

@ccclass('UIManager')
export class UIManager extends Component {
    public static instance: UIManager = null;

    // --- Các thuộc tính cho UI chung ---
    @property({type: Label})
    rubyCountLabel: Label = null!;

    @property({type: Label})
    coinCountLabel: Label = null!;

    // --- Các thuộc tính cho màn hình chọn Hero ---
    @property({ type: Node, tooltip: "Node cha của giao diện chọn tướng (ví dụ: HeroSelectionUI)." })
    heroSelectionUI: Node = null!;

    @property({ type: CardSelectionManager, tooltip: "Kéo node chứa script CardSelectionManager vào đây." })
    cardSelectionManager: CardSelectionManager = null!;

    @property({ type: Node, tooltip: "Lớp phủ màu đen để làm mờ nền." })
    dimOverlay: Node = null!;

    @property({ type: Node, tooltip: "Màn hình hiển thị khi chiến thắng." })
    nextLevelScreen: Node = null!;

    onLoad() {
        if (UIManager.instance === null) {
            UIManager.instance = this;
        } else {
            this.node.destroy();
            return;
        }
    }

    start() {
        if (this.heroSelectionUI) this.heroSelectionUI.active = false;
        if (this.dimOverlay) this.dimOverlay.active = false;
        if (this.nextLevelScreen) this.nextLevelScreen.active = false;
    }

    public showHeroSelectionUI(): void {
        if (this.heroSelectionUI && this.cardSelectionManager) {
            if (this.dimOverlay) {
                this.dimOverlay.active = true;
                const opacity = this.dimOverlay.getComponent(UIOpacity) || this.dimOverlay.addComponent(UIOpacity);
                opacity.opacity = 0;
                tween(opacity).to(0.3, { opacity: 200 }, { easing: 'quadOut' }).start();
            }
            this.heroSelectionUI.active = true;
            this.cardSelectionManager.showSelection();
        }
    }

    public hideHeroSelectionUI(): void {
        if (this.heroSelectionUI && this.cardSelectionManager) {
            if (this.dimOverlay) {
                const opacity = this.dimOverlay.getComponent(UIOpacity);
                if (opacity) {
                    tween(opacity).to(0.3, { opacity: 0 }, { easing: 'quadIn' })
                        .call(() => { this.dimOverlay.active = false; })
                        .start();
                }
            }
            this.cardSelectionManager.hideSelection();
            this.heroSelectionUI.active = false;
        }
    }

    public showNextLevelScreen(): void {
        if (this.dimOverlay) {
            this.dimOverlay.active = true;
            const opacity = this.dimOverlay.getComponent(UIOpacity) || this.dimOverlay.addComponent(UIOpacity);
            opacity.opacity = 0;
            tween(opacity).to(0.3, { opacity: 200 }, { easing: 'quadOut' }).start();
        }

        if (this.nextLevelScreen) {
            this.nextLevelScreen.active = true;
        }
    }

    public updateRubyLabel(count: number): void {
        this.rubyCountLabel.string = count.toString();
    }

    public updateCoinLabel(count: number): void {
        this.coinCountLabel.string = count.toString();
    }
}