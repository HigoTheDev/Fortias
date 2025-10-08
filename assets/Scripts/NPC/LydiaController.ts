import { _decorator, Component, Node, sp, Prefab, instantiate, macro, CCFloat, CircleCollider2D, Contact2DType, IPhysics2DContact, Vec3, UITransform } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('LydiaController')
export class LydiaController extends Component {

    @property(sp.Skeleton)
    public spine: sp.Skeleton = null!;

    @property(Prefab)
    public bulletPrefab: Prefab = null!;

    @property(Prefab)
    public laserPrefab: Prefab = null!;

    @property(Node)
    public bulletSpawnPoint: Node = null!;

    @property({ type: CCFloat, tooltip: "Tốc độ tấn công (số đạn bắn ra mỗi giây)" })
    public attackRate: number = 2; // Ví dụ: 2 phát/giây

    @property({ type: CCFloat, tooltip: "Phạm vi Lydia có thể phát hiện và tấn công kẻ địch" })
    public detectionRadius: number = 300;

    // --- Biến nội bộ ---
    private targetEnemy: Node | null = null;
    private isAttacking: boolean = false;
    private attackCounter: number = 0;
    private attackInterval: number = 0;

    onLoad() {
        // Chuyển đổi attackRate thành khoảng thời gian giữa mỗi lần tấn công
        this.attackInterval = 1 / this.attackRate;
        this.setupDetectionCollider();
    }

    start() {
        this.setAnimation('idle', true);
    }

    /**
     * Thiết lập vùng phát hiện kẻ địch bằng CircleCollider2D
     */
    private setupDetectionCollider() {
        // Thêm một CircleCollider2D vào node này
        const collider = this.node.addComponent(CircleCollider2D);
        collider.radius = this.detectionRadius;
        collider.sensor = true; // Đặt là Sensor để chỉ phát hiện va chạm, không gây hiệu ứng vật lý

        // Đăng ký sự kiện va chạm
        collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        collider.on(Contact2DType.END_CONTACT, this.onEndContact, this);
    }

    /**
     * Khi có kẻ địch đi vào vùng phát hiện
     */
    private onBeginContact(selfCollider: CircleCollider2D, otherCollider: CircleCollider2D, contact: IPhysics2DContact | null) {
        // Giả sử kẻ địch của bạn có tag là "Enemy"
        if (otherCollider.node.name.includes('Enemy') && !this.targetEnemy) {
            console.log("Phát hiện Enemy, bắt đầu tấn công!");
            this.targetEnemy = otherCollider.node;
            this.startAttacking();
        }
    }

    /**
     * Khi kẻ địch đi ra khỏi vùng phát hiện
     */
    private onEndContact(selfCollider: CircleCollider2D, otherCollider: CircleCollider2D, contact: IPhysics2DContact | null) {
        // Chỉ dừng tấn công nếu đúng kẻ địch mục tiêu đã đi ra
        if (this.targetEnemy && this.targetEnemy === otherCollider.node) {
            console.log("Enemy đã rời đi, ngừng tấn công.");
            this.stopAttacking();
        }
    }

    private startAttacking() {
        if (this.isAttacking || !this.targetEnemy) return;
        this.isAttacking = true;

        // Bắt đầu chuỗi tấn công lặp đi lặp lại
        this.schedule(this.performAttack, this.attackInterval, macro.REPEAT_FOREVER);
    }

    private stopAttacking() {
        if (!this.isAttacking) return;

        this.isAttacking = false;
        this.targetEnemy = null;
        this.attackCounter = 0; // Reset bộ đếm khi dừng
        this.setAnimation('idle', true);

        // Hủy lịch tấn công
        this.unschedule(this.performAttack);
    }

    /**
     * Hàm thực hiện một lần tấn công trong chuỗi
     */
    private performAttack() {
        // Kiểm tra nếu mục tiêu đã bị phá hủy hoặc không hợp lệ
        if (!this.targetEnemy || !this.targetEnemy.isValid) {
            this.stopAttacking();
            return;
        }

        this.attackCounter++;

        // Quay mặt về phía kẻ địch
        this.faceTarget(this.targetEnemy.worldPosition);

        if (this.attackCounter < 10) {
            // Tấn công thường 9 lần đầu
            this.setAnimation('attack_range_1', false);
            this.fireBullet(this.bulletPrefab);

            // Sau khi bắn xong, quay về trạng thái chờ cho lần bắn tiếp theo
            this.spine.setCompleteListener(() => {
                this.setAnimation('idle', true);
                this.spine.setCompleteListener(null); // Xóa listener để không bị gọi lại
            });

        } else {
            // Lần thứ 10: Dùng skill đặc biệt
            this.setAnimation('skill_1', false);
            this.fireBullet(this.laserPrefab);

            this.spine.setCompleteListener(() => {
                this.setAnimation('idle', true);
                this.spine.setCompleteListener(null);
            });

            // Reset bộ đếm để bắt đầu chu kỳ mới
            this.attackCounter = 0;
        }
    }

    private fireBullet(prefab: Prefab) {
        if (!prefab || !this.bulletSpawnPoint) return;

        const bulletNode = instantiate(prefab);
        this.node.scene.addChild(bulletNode); // Thêm đạn vào scene

        // Đặt vị trí ban đầu của đạn tại điểm spawn
        bulletNode.setWorldPosition(this.bulletSpawnPoint.getWorldPosition());

        // (Tùy chọn) Truyền mục tiêu cho script của viên đạn để nó tự bay tới
        const bulletScript = bulletNode.getComponent('BulletController'); // Giả sử script của đạn tên là BulletController
        if (bulletScript && 'setTarget' in bulletScript) {
            (bulletScript as any).setTarget(this.targetEnemy);
        }
    }

    private faceTarget(targetPosition: Vec3) {
        const direction = targetPosition.x - this.node.worldPosition.x;
        // Nếu mục tiêu ở bên phải, scale.x = 1 (hoặc |-1|), bên trái thì scale.x = -1
        this.node.scale = new Vec3(direction > 0 ? -1 : 1, 1, 1);
    }

    /**
     * Hàm helper để set animation cho Spine
     */
    private setAnimation(name: string, loop: boolean) {
        if (this.spine.animation === name) return;
        this.spine.setAnimation(0, name, loop);
    }

    update(dt: number) {
        // Nếu đang tấn công mà mục tiêu biến mất, dừng lại
        if (this.isAttacking && (!this.targetEnemy || !this.targetEnemy.isValid)) {
            this.stopAttacking();
        }
    }
}