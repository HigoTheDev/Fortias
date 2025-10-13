import { _decorator, Component, Label, Node, UIOpacity, tween, director, easing } from 'cc';
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
    @property({ type: Node, tooltip: "Node cha của giao diện chọn tướng." })
    heroSelectionUI: Node = null!;

    @property({ type: CardSelectionManager, tooltip: "Kéo node chứa script CardSelectionManager vào đây." })
    cardSelectionManager: CardSelectionManager = null!;

    @property({ type: Node, tooltip: "Lớp mờ dành cho Hero Selection." })
    dimOverlay: Node = null!;

    // --- Các thuộc tính cho màn hình kết thúc ---
    @property({ type: Node, tooltip: "Màn hình hiển thị khi chiến thắng." })
    nextLevelScreen: Node = null!;

    @property({type: Node, tooltip: "Lớp mờ dành RIÊNG cho màn hình kết thúc."})
    endSceneOverlay: Node = null!;

    // --- Các biến trạng thái ---
    private currentCoin: number = 0;
    private currentRuby: number = 0;

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
        if (this.endSceneOverlay) this.endSceneOverlay.active = false;
    }

    // --- Các hàm cho Giao diện Chọn Hero ---
    public showHeroSelectionUI(): void {
        if (this.heroSelectionUI && this.cardSelectionManager) {
            this.fadeInOverlay(this.dimOverlay);
            this.heroSelectionUI.active = true;
            this.cardSelectionManager.showSelection();
        }
    }

    public hideHeroSelectionUI(): void {
        if (this.heroSelectionUI && this.cardSelectionManager) {
            this.fadeOutOverlay(this.dimOverlay);
            this.cardSelectionManager.hideSelection();
            this.heroSelectionUI.active = false;
        }
    }

    // --- Các hàm cho Màn hình Qua Màn (Next Level) ---
    public showNextLevelScreen(): void {
        this.fadeInOverlay(this.endSceneOverlay);
        if (this.nextLevelScreen) {
            this.nextLevelScreen.active = true;
        }
    }

    public hideNextLevelScreen(): void {
        this.fadeOutOverlay(this.endSceneOverlay);
        if (this.nextLevelScreen) {
            this.nextLevelScreen.active = false;
        }
    }

    public onNextLevelButtonClicked() {
        console.log("Chuyển sang màn chơi tiếp theo...");
        // Ví dụ: director.loadScene('Level_2');
        this.hideNextLevelScreen();
    }

    public onGoToMenuButtonClicked() {
        console.log("Quay về Menu chính...");
        // Ví dụ: director.loadScene('MainMenu');
        this.hideNextLevelScreen();
    }

    // --- Các hàm cập nhật Label ---
    public updateRubyLabel(count: number): void {
        this.rubyCountLabel.string = count.toString();
        this.currentRuby = count;
    }

    public updateCoinLabel(count: number): void {
        this.coinCountLabel.string = count.toString();
        this.currentCoin = count;
    }

    public updateCoinLabelAnimated(targetValue: number, duration: number = 0.5): void {
        const temp = { value: this.currentCoin };
        tween(temp)
            .to(duration, { value: targetValue }, {
                easing: 'cubicOut',
                onUpdate: () => {
                    this.coinCountLabel.string = Math.floor(temp.value).toString();
                }
            })
            .call(() => {
                this.currentCoin = targetValue;
                this.coinCountLabel.string = targetValue.toString();
            })
            .start();
    }

    // --- Các hàm tiện ích (private) ---
    private fadeInOverlay(overlayNode: Node) {
        if (overlayNode) {
            overlayNode.active = true;
            const opacity = overlayNode.getComponent(UIOpacity) || overlayNode.addComponent(UIOpacity);
            opacity.opacity = 0;
            tween(opacity).to(0.3, { opacity: 200 }, { easing: 'quadOut' }).start();
        }
    }

    private fadeOutOverlay(overlayNode: Node) {
        if (overlayNode) {
            const opacity = overlayNode.getComponent(UIOpacity);
            if (opacity) {
                tween(opacity).to(0.3, { opacity: 0 }, { easing: 'quadIn' })
                    .call(() => { if (overlayNode) overlayNode.active = false; })
                    .start();
            }
        }
    }
}