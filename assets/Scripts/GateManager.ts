// File: GateManager.ts
import { _decorator, Component, Node, Prefab, instantiate, Vec3, tween, v3, CCInteger, UIOpacity } from 'cc';
import { CoinGateController } from './CoinGateController';
import { HeroCardController } from './HeroCardController';

const { ccclass, property } = _decorator;

@ccclass('GateManager')
export class GateManager extends Component {

    public static instance: GateManager = null!;

    // --- Thuộc tính cơ bản ---
    @property({ type: Prefab, tooltip: "Prefab của CoinGate để spawn." })
    public gatePrefab: Prefab = null!;

    @property({ type: [Node], tooltip: "Danh sách các Node vị trí để spawn cổng và trụ THEO THỨ TỰ." })
    public spawnPoints: Node[] = [];

    @property({ type: [Prefab], tooltip: "Danh sách các Prefab Trụ, THEO THỨ TỰ tương ứng với Spawn Points." })
    public towerPrefabs: Prefab[] = [];

    @property({ type: [CCInteger], tooltip: "Danh sách chi phí (số Coin) cho mỗi cổng, THEO THỨ TỰ." })
    public gateCosts: number[] = [3, 50, 60];

    // --- Thuộc tính cho việc chọn Hero ---
    @property({ type: Node, tooltip: "UI Node chứa các thẻ bài để người chơi lựa chọn." })
    public heroSelectionUI: Node = null!;

    @property({ type: [Prefab], tooltip: "Hồ chứa tất cả các Prefab Thẻ Bài Hero (ví dụ: có 4 thẻ)." })
    public heroCardPool: Prefab[] = [];

    @property({ type: Node, tooltip: "Lớp phủ màu đen bán trong suốt để làm mờ nền." })
    public dimOverlay: Node = null!;

    // --- Biến nội bộ ---
    private currentSpawnIndex: number = -1;
    private lastSpawnedTower: Node = null;

    onLoad() {
        if (GateManager.instance === null) {
            GateManager.instance = this;
        } else {
            this.destroy();
        }
    }

    start() {
        // Ẩn các UI không cần thiết khi bắt đầu
        if (this.heroSelectionUI) this.heroSelectionUI.active = false;
        if (this.dimOverlay) this.dimOverlay.active = false;

        // Kiểm tra các thuộc tính
        if (!this.gatePrefab || this.spawnPoints.length === 0) {
            console.error("Chưa gán Gate Prefab hoặc Spawn Points cho GateManager!");
            return;
        }
        if (this.spawnPoints.length !== this.towerPrefabs.length || this.spawnPoints.length !== this.gateCosts.length) {
            console.warn("Số lượng Spawn Points, Tower Prefabs, và Gate Costs không bằng nhau! Điều này có thể gây lỗi.");
        }
        if (this.heroCardPool.length < 2) {
            console.error("Hero Card Pool cần ít nhất 2 thẻ bài!");
        }

        this.spawnNextGate();
    }

    public onGateUnlocked(unlockedPoint: Node) {
        this.spawnTowerAtPoint(unlockedPoint);
        this.showHeroSelection();
    }

    private showHeroSelection() {
        if (!this.heroSelectionUI || this.heroCardPool.length < 2) return;

        // Bật và làm mờ dần lớp phủ
        if (this.dimOverlay) {
            this.dimOverlay.active = true;
            const opacity = this.dimOverlay.getComponent(UIOpacity);
            if (opacity) {
                opacity.opacity = 0;
                tween(opacity).to(0.3, { opacity: 200 }, { easing: 'quadOut' }).start();
            }
        }

        // Hiển thị 2 thẻ bài ngẫu nhiên
        this.heroSelectionUI.removeAllChildren();
        const shuffledCards = [...this.heroCardPool].sort(() => 0.5 - Math.random());
        const cardsToOffer = shuffledCards.slice(0, 2);
        for (const cardPrefab of cardsToOffer) {
            const cardNode = instantiate(cardPrefab);
            this.heroSelectionUI.addChild(cardNode);
        }
        this.heroSelectionUI.active = true;
    }

    public onHeroSelected(heroPrefab: Prefab) {
        // Ẩn UI và lớp phủ
        this.heroSelectionUI.active = false;
        this.heroSelectionUI.removeAllChildren();

        if (this.dimOverlay) {
            const opacity = this.dimOverlay.getComponent(UIOpacity);
            if (opacity) {
                tween(opacity).to(0.3, { opacity: 0 }, { easing: 'quadIn' })
                    .call(() => {
                        this.dimOverlay.active = false;
                    })
                    .start();
            } else {
                this.dimOverlay.active = false;
            }
        }

        // Đặt hero lên trụ
        if (this.lastSpawnedTower && heroPrefab) {
            const mountPoint = this.lastSpawnedTower.getChildByName("heroMountPoint");
            if (mountPoint) {
                const heroNode = instantiate(heroPrefab);
                mountPoint.addChild(heroNode);
            } else {
                console.error(`Không tìm thấy node con tên "heroMountPoint" trên trụ ${this.lastSpawnedTower.name}!`);
            }
        }

        // Spawn cổng tiếp theo
        this.scheduleOnce(() => { this.spawnNextGate(); }, 1.0);
    }

    private spawnNextGate() {
        this.currentSpawnIndex++;

        if (this.currentSpawnIndex >= this.spawnPoints.length) {
            console.log("🎉 Đã xây tất cả các trụ! Màn chơi hoàn thành!");
            return;
        }

        const spawnPoint = this.spawnPoints[this.currentSpawnIndex];
        const cost = this.gateCosts[this.currentSpawnIndex];
        this.spawnGateAtPoint(spawnPoint, cost);
    }

    private spawnGateAtPoint(point: Node, cost: number) {
        if (!this.gatePrefab) return;
        const gate = instantiate(this.gatePrefab);
        this.node.addChild(gate);
        gate.setWorldPosition(point.worldPosition);

        const gateController = gate.getComponent(CoinGateController);
        if (gateController) {
            gateController.initialize(point, cost);
        }
    }

    private spawnTowerAtPoint(point: Node) {
        const pointIndex = this.spawnPoints.indexOf(point);
        if (pointIndex === -1) {
            console.error("Lỗi: Không tìm thấy điểm spawn trong danh sách.", point);
            return;
        }
        if (pointIndex >= this.towerPrefabs.length || !this.towerPrefabs[pointIndex]) {
            console.error(`Chưa gán Tower Prefab cho vị trí thứ ${pointIndex + 1}!`);
            return;
        }

        const towerPrefabToSpawn = this.towerPrefabs[pointIndex];
        const tower = instantiate(towerPrefabToSpawn);
        this.node.addChild(tower);
        tower.setWorldPosition(point.worldPosition);

        tower.scale = v3(0, 0, 0);
        tween(tower)
            .to(0.5, { scale: v3(1, 1, 1) }, { easing: 'backOut' })
            .start();

        this.lastSpawnedTower = tower;
    }
}