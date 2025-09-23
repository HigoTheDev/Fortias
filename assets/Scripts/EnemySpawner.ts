import { _decorator, Component, Prefab, Node, instantiate, Vec3, math } from 'cc';
import { EnemyManager } from './EnemyManager';
import { Fence } from './Fence';
const { ccclass, property } = _decorator;

@ccclass('EnemySpawner')
export class EnemySpawner extends Component {

    @property({ type: Prefab })
    enemyPrefab: Prefab = null;

    @property({ type: Node })
    parentNode: Node = null;

    @property({ type: EnemyManager })
    enemyManager: EnemyManager = null;

    @property({ type: Node, tooltip: "Node cha chứa tất cả các hàng rào" })
    private fenceContainer: Node = null;

    @property({ type: Prefab, tooltip: "Prefab của hàng rào" })
    private fencePrefab: Prefab = null;

    @property
    spawnInterval: number = 3;

    @property
    maxEnemies: number = 10;

    @property({ tooltip: "Số quái vật tối thiểu mỗi đợt" })
    minSpawnGroup: number = 5;

    @property({ tooltip: "Số quái vật tối đa mỗi đợt" })
    maxSpawnGroup: number = 20;

    private timer: number = 0;

    // Giới hạn bản đồ (bạn chỉnh lại theo map của bạn)
    private mapBounds = {
        xMin: -1000,
        xMax: -400,
        yMin: -800,
        yMax: 1000
    };

    // Khoảng cách tối thiểu so với Player (không spawn quá gần)
    private minDistanceFromPlayer: number = 200;

    start() {
        if (this.enemyManager && this.fenceContainer) {
            const fences = this.fenceContainer.children;

            // 🔥 VÔ HIỆU HÓA: Dòng này không còn cần thiết vì Goblin không cần danh sách hàng rào từ trước nữa.
            // this.enemyManager.setFences(fences);

            // Lắng nghe sự kiện phá hủy của tất cả hàng rào
            for (const fence of fences) {
                fence.on(Fence.EVENT_DESTROYED, this.onFenceDestroyed, this);
            }
        } else {
            console.error("Lỗi: Vui lòng gán EnemyManager hoặc FenceContainer trong Inspector!");
        }
    }

    update(deltaTime: number) {
        this.timer += deltaTime;
        if (this.timer >= this.spawnInterval) {
            this.timer = 0;

            if (this.enemyManager.getEnemyCount() < this.maxEnemies) {
                const numToSpawn = math.randomRangeInt(this.minSpawnGroup, this.maxSpawnGroup + 1);

                for (let i = 0; i < numToSpawn; i++) {
                    let spawnPos: Vec3;

                    // Lấy vị trí ngẫu nhiên cho đến khi hợp lệ
                    do {
                        spawnPos = new Vec3(
                            math.randomRangeInt(this.mapBounds.xMin, this.mapBounds.xMax),
                            math.randomRangeInt(this.mapBounds.yMin, this.mapBounds.yMax),
                            0
                        );
                    } while (!this.isValidSpawn(spawnPos));

                    if (this.enemyManager.getEnemyCount() < this.maxEnemies) {
                        this.spawnEnemy(spawnPos);
                    } else {
                        break;
                    }
                }
            }
        }
    }

    private isValidSpawn(pos: Vec3): boolean {
        // TODO: Lấy vị trí thật sự của Player (vd: từ PlayerController)
        const playerPos = new Vec3(0, 0, 0);
        return Vec3.distance(pos, playerPos) > this.minDistanceFromPlayer;
    }

    spawnEnemy(position: Vec3) {
        if (this.enemyPrefab == null) return;
        const enemy = instantiate(this.enemyPrefab);
        enemy.setPosition(position);

        if (this.parentNode) {
            this.parentNode.addChild(enemy);
        } else {
            this.node.addChild(enemy);
        }

        if (this.enemyManager) {
            this.enemyManager.addEnemy(enemy);
        }
    }

    onFenceDestroyed(destroyedFencePos: Vec3) {
        if (this.fencePrefab) {
            const newFence = instantiate(this.fencePrefab);
            newFence.setPosition(destroyedFencePos);
            this.fenceContainer.addChild(newFence);

            // Lắng nghe sự kiện phá hủy của hàng rào mới
            newFence.on(Fence.EVENT_DESTROYED, this.onFenceDestroyed, this);

            // 🔥 VÔ HIỆU HÓA: Dòng này cũng không còn cần thiết.
            // this.enemyManager.setFences(this.fenceContainer.children);
        }
    }
}