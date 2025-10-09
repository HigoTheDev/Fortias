import { _decorator, Component, Node, Prefab, instantiate, tween, Tween, v3 } from 'cc';
import { HeroCardController } from './HeroCardController'; // Cần import để lấy component

const { ccclass, property } = _decorator;

@ccclass('CardSelectionManager')
export class CardSelectionManager extends Component {

    // "Danh sách đen" tĩnh (static) để lưu tên các thẻ đã được sử dụng.
    // Dùng static để danh sách này được chia sẻ và tồn tại qua nhiều lần gọi.
    private static usedCardNames: Set<string> = new Set<string>();

    @property({
        type: [Prefab],
        tooltip: "Hồ chứa TẤT CẢ các Prefab Thẻ Bài có thể có trong game."
    })
    public cardPrefabs: Prefab[] = [];

    @property({
        type: Node,
        tooltip: "Node cha để chứa các thẻ bài được tạo ra (ví dụ: CardContainer)."
    })
    public cardContainer: Node = null!;

    @property({
        type: Node,
        tooltip: "Node hình ảnh ngón tay chỉ trỏ."
    })
    public pointingFinger: Node = null!;

    // --- Thuộc tính hiệu ứng ---
    @property({ tooltip: "Thời gian cho hiệu ứng nảy lên (giây)." })
    public bounceDuration: number = 0.5;

    @property({ tooltip: "Góc lắc tối đa của thẻ bài." })
    public shakeAngle: number = 7;

    @property({ tooltip: "Thời gian cho một chu kỳ lắc." })
    public shakeDuration: number = 0.4;

    @property({ type: Number, tooltip: "Số lần thẻ bài sẽ lắc." })
    public shakeCount: number = 3;

    @property({ tooltip: "Thời gian ngón tay di chuyển giữa các thẻ." })
    public fingerMoveDuration: number = 0.7;

    private instantiatedCard1: Node = null;
    private instantiatedCard2: Node = null;

    /**
     * Hàm tĩnh (static) để các script khác (HeroCardController) có thể gọi
     * và đánh dấu một thẻ bài là đã được sử dụng.
     * @param cardName Tên của Prefab Thẻ Bài đã được chọn.
     */
    public static markCardAsUsed(cardName: string) {
        if (cardName) {
            this.usedCardNames.add(cardName);
            console.log(`Đã đánh dấu thẻ '${cardName}' là đã sử dụng. Các thẻ đã dùng:`, Array.from(this.usedCardNames));
        }
    }

    onLoad() {
        if (this.pointingFinger) {
            this.pointingFinger.active = false;
        }
    }

    /**
     * Bắt đầu hiển thị giao diện lựa chọn thẻ bài.
     */
    public showSelection(): void {
        if (this.cardPrefabs.length < 2) {
            console.error("Lỗi: Card Prefabs cần ít nhất 2 thẻ trong danh sách tổng!");
            return;
        }
        if (this.pointingFinger) {
            this.pointingFinger.active = true;
        }
        this.spawnRandomCards();
        this.scheduleOnce(() => {
            this.playEntryAnimation();
            this.startFingerAnimation();
        });
    }

    /**
     * Ẩn và dọn dẹp giao diện lựa chọn.
     */
    public hideSelection(): void {
        if (this.pointingFinger) {
            this.pointingFinger.active = false;
        }
        this.stopAnimations();
        this.clearOldCards();
    }

    /**
     * Lọc, chọn ngẫu nhiên và tạo ra 2 thẻ bài hợp lệ.
     */
    private spawnRandomCards() {
        this.clearOldCards();

        // 1. Lọc ra danh sách các thẻ CHƯA được sử dụng
        const availableCards = this.cardPrefabs.filter(p => !CardSelectionManager.usedCardNames.has(p.name));

        if (availableCards.length < 2) {
            console.warn("Không còn đủ 2 thẻ bài chưa sử dụng để lựa chọn!");
            // Bạn có thể xử lý logic kết thúc game, reset thẻ, hoặc hiển thị thông báo ở đây
            return;
        }

        // 2. Xáo trộn và chọn 2 thẻ từ danh sách CÓ SẴN
        const shuffledCards = availableCards.sort(() => 0.5 - Math.random());
        const cardsToOffer = shuffledCards.slice(0, 2);

        for (const cardPrefab of cardsToOffer) {
            const cardNode = instantiate(cardPrefab);

            // 3. Gán tên của Prefab vào script của thẻ để nó biết "mình là ai"
            const controller = cardNode.getComponent(HeroCardController);
            if (controller) {
                controller.cardPrefabName = cardPrefab.name;
            } else {
                console.error(`LỖI: Prefab thẻ bài '${cardPrefab.name}' thiếu script HeroCardController!`);
            }

            cardNode.scale = v3(0, 0, 0);
            this.cardContainer.addChild(cardNode);

            if (this.instantiatedCard1 === null) {
                this.instantiatedCard1 = cardNode;
            } else {
                this.instantiatedCard2 = cardNode;
            }
        }
    }

    private playEntryAnimation() {
        const bounceAndShake = (node: Node) => {
            if (!node) return;
            tween(node)
                .to(this.bounceDuration, { scale: v3(0.75, 0.75, 0.75) }, { easing: 'backOut' })
                .call(() => { this.startCardShakeAnimation(node); })
                .start();
        };

        if (this.instantiatedCard1) {
            bounceAndShake(this.instantiatedCard1);
        }
        if (this.instantiatedCard2) {
            tween(this.node).delay(0.1).call(() => bounceAndShake(this.instantiatedCard2)).start();
        }
    }

    private startCardShakeAnimation(nodeToShake: Node) {
        if (!nodeToShake || this.shakeCount <= 0) return;
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
        if (!this.pointingFinger || !this.pointingFinger.active || !this.instantiatedCard1 || !this.instantiatedCard2) return;

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

    private stopAnimations() {
        if (this.instantiatedCard1) Tween.stopAllByTarget(this.instantiatedCard1);
        if (this.instantiatedCard2) Tween.stopAllByTarget(this.instantiatedCard2);
        if (this.pointingFinger) Tween.stopAllByTarget(this.pointingFinger);
    }

    private clearOldCards() {
        if (this.cardContainer) {
            this.cardContainer.removeAllChildren();
        }
        this.instantiatedCard1 = null;
        this.instantiatedCard2 = null;
    }
}