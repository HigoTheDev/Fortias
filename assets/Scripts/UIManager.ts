// File: UIManager.ts
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
    @property({ type: Node, tooltip: "Node cha của giao diện chọn tướng (ví dụ: HeroSelectionUI)." })
    heroSelectionUI: Node = null!;

    @property({ type: CardSelectionManager, tooltip: "Kéo node chứa script CardSelectionManager vào đây." })
    cardSelectionManager: CardSelectionManager = null!;

    @property({ type: Node, tooltip: "Lớp phủ màu đen để làm mờ nền." })
    dimOverlay: Node = null!;

    @property({ type: Node, tooltip: "Màn hình hiển thị khi chiến thắng." })
    nextLevelScreen: Node = null!;


    private currentCoin: number = 0;
    private currentRuby: number = 0;
    private dimRequestCount: number = 0;

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

    // --- Các hàm cho Giao diện Chọn Hero ---

    public showHeroSelectionUI(): void {
        if (this.heroSelectionUI && this.cardSelectionManager) {
            this.fadeInOverlay();
            this.heroSelectionUI.active = true;
            this.cardSelectionManager.showSelection();
        }
    }

    public hideHeroSelectionUI(): void {
        if (this.heroSelectionUI && this.cardSelectionManager) {
            this.fadeOutOverlay();
            this.cardSelectionManager.hideSelection();
            this.heroSelectionUI.active = false;
        }
    }

    // --- Các hàm cho Màn hình Qua Màn (Next Level) ---

    public showNextLevelScreen(): void {
        this.fadeInOverlay();
        if (this.nextLevelScreen) {
            this.nextLevelScreen.active = true;
        }
    }

    // --- BỔ SUNG: Hàm để ẩn màn hình qua màn ---
    public hideNextLevelScreen(): void {
        this.fadeOutOverlay();
        if (this.nextLevelScreen) {
            this.nextLevelScreen.active = false;
        }
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

    // --- BỔ SUNG: Hàm cập nhật Label với hiệu ứng đếm số ---
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
                this.coinCountLabel.string = targetValue.toString(); // Đảm bảo giá trị cuối cùng chính xác
            })
            .start();
    }

    // --- Các hàm tiện ích (private) ---

    private fadeInOverlay() {
        if (!this.dimOverlay) return;

        // Nếu đây là yêu cầu đầu tiên, thì mới thực hiện fade in
        if (this.dimRequestCount === 0) {
            console.log("Fade In Overlay");
            this.dimOverlay.active = true;
            const opacity = this.dimOverlay.getComponent(UIOpacity) || this.dimOverlay.addComponent(UIOpacity);
            opacity.opacity = 0;
            tween(opacity).to(0.3, { opacity: 200 }, { easing: 'quadOut' }).start();
        }
        // Luôn tăng bộ đếm
        this.dimRequestCount++;
    }

    private fadeOutOverlay() {
        if (!this.dimOverlay) return;

        // Luôn giảm bộ đếm
        this.dimRequestCount--;

        // Đảm bảo bộ đếm không bị âm
        if (this.dimRequestCount < 0) this.dimRequestCount = 0;

        // Nếu không còn ai yêu cầu nữa, thì mới thực hiện fade out
        if (this.dimRequestCount === 0) {
            console.log("Fade Out Overlay");
            const opacity = this.dimOverlay.getComponent(UIOpacity);
            if (opacity) {
                tween(opacity).to(0.3, { opacity: 0 }, { easing: 'quadIn' })
                    .call(() => { if (this.dimOverlay) this.dimOverlay.active = false; })
                    .start();
            }
        }
    }
}