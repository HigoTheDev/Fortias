// File: CardSelectionManager.ts (Thêm hiệu ứng Nảy và Lắc)
import { _decorator, Component, Node, Prefab, instantiate, tween, Tween, v3 } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('CardSelectionManager')
export class CardSelectionManager extends Component {
    @property({ type: [Prefab], tooltip: "Hồ chứa tất cả Prefab Thẻ Bài Hero." })
    public cardPrefabs: Prefab[] = [];

    @property({ type: Node, tooltip: "Node cha để chứa các thẻ bài được tạo ra (chính là HeroSelectionUI)." })
    public cardContainer: Node = null!;

    @property({ type: Node, tooltip: "Node hình ảnh ngón tay chỉ trỏ." })
    public pointingFinger: Node = null!;

    // --- Thuộc tính hiệu ứng ---
    @property({ tooltip: "Thời gian cho hiệu ứng nảy lên (giây)." })
    public bounceDuration: number = 0.5;

    @property({ tooltip: "Góc lắc tối đa của thẻ bài. Tăng giá trị này để lắc mạnh hơn." })
    public shakeAngle: number = 7; // Tăng giá trị mặc định để lắc mạnh hơn

    @property
    public shakeDuration: number = 0.4; // Giảm thời gian để lắc nhanh hơn

    @property({ type: Number, tooltip: "Số lần thẻ bài sẽ lắc sau khi nảy lên." })
    public shakeCount: number = 3;

    @property
    public fingerMoveDuration: number = 0.7;

    private instantiatedCard1: Node = null;
    private instantiatedCard2: Node = null;

    onLoad() {
        if (this.pointingFinger) {
            this.pointingFinger.active = false;
        }
    }

    public showSelection(): void {
        if (this.cardPrefabs.length < 2) {
            console.error("Card Prefabs cần ít nhất 2 thẻ!");
            return;
        }
        this.pointingFinger.active = true;
        this.spawnRandomCards();
        this.scheduleOnce(() => {
            // Chạy hiệu ứng xuất hiện và hiệu ứng ngón tay cùng lúc
            this.playEntryAnimation();
            this.startFingerAnimation();
        });
    }

    public hideSelection(): void {
        this.pointingFinger.active = false;
        this.stopAnimations();
        this.clearOldCards();
    }

    private spawnRandomCards() {
        this.clearOldCards();
        const shuffledCards = [...this.cardPrefabs].sort(() => 0.5 - Math.random());
        const cardsToOffer = shuffledCards.slice(0, 2);
        for (const cardPrefab of cardsToOffer) {
            const cardNode = instantiate(cardPrefab);
            cardNode.scale = v3(0, 0, 0);
            this.cardContainer.addChild(cardNode);
            if (this.instantiatedCard1 === null) this.instantiatedCard1 = cardNode;
            else this.instantiatedCard2 = cardNode;
        }
    }

    private playEntryAnimation() {
        const bounceAndShake = (node: Node) => {
            tween(node)
                .to(this.bounceDuration, { scale: v3(0.75, 0.75, 0.75) }, { easing: 'backOut' })
                .call(() => {
                    this.startCardShakeAnimation(node);
                })
                .start();
        };

        if (this.instantiatedCard1) bounceAndShake(this.instantiatedCard1);
        if (this.instantiatedCard2) {
            // Thêm một chút delay cho thẻ thứ 2 để hiệu ứng đẹp hơn
            tween(this.node).delay(0.1).call(() => bounceAndShake(this.instantiatedCard2)).start();
        }
    }

    // THAY ĐỔI: Hàm lắc giờ chỉ áp dụng cho một node cụ thể
    private startCardShakeAnimation(nodeToShake: Node) {
        if (this.shakeCount <= 0) return;

        tween(nodeToShake)
            .sequence(
                tween().to(this.shakeDuration / 4, { angle: this.shakeAngle }),
                tween().to(this.shakeDuration / 2, { angle: -this.shakeAngle }),
                tween().to(this.shakeDuration / 4, { angle: 0 })
            )
            .repeat(this.shakeCount)
            .start();
    }

    private startFingerAnimation() {
        if (!this.pointingFinger.active || !this.instantiatedCard1 || !this.instantiatedCard2) return;

        // Ngón tay sẽ di chuyển tới vị trí cuối cùng của các thẻ
        const card1Pos = this.instantiatedCard1.position;
        const card2Pos = this.instantiatedCard2.position;
        this.pointingFinger.setPosition(card1Pos);

        tween(this.pointingFinger)
            .sequence(
                tween().to(this.fingerMoveDuration, { position: card2Pos }, { easing: 'cubicInOut' }),
                tween().delay(0.3),
                tween().to(this.fingerMoveDuration, { position: card1Pos }, { easing: 'cubicInOut' }),
                tween().delay(0.3)
            )
            .repeatForever()
            .start();
    }

    private stopAnimations() { if (this.instantiatedCard1) Tween.stopAllByTarget(this.instantiatedCard1); if (this.instantiatedCard2) Tween.stopAllByTarget(this.instantiatedCard2); if (this.pointingFinger) Tween.stopAllByTarget(this.pointingFinger); }
    private clearOldCards() { if (this.cardContainer) this.cardContainer.removeAllChildren(); this.instantiatedCard1 = null; this.instantiatedCard2 = null; }
}