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

    start() {
        if (this.enemyManager && this.fenceContainer) {
            const fences = this.fenceContainer.children;
            this.enemyManager.setFences(fences);

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
                const spawnZones = [
                    { xMin: -800, xMax: -380, yMin: 5, yMax: 15 },
                    { xMin: -700, xMax: -380, yMin: 300, yMax: 840 },
                    { xMin: -160, xMax: -140, yMin: 400, yMax: 700 },
                    { xMin: -200, xMax: -150, yMin: -500, yMax: -300 }
                ];
                const zone = spawnZones[math.randomRangeInt(0, spawnZones.length)];

                const numToSpawn = math.randomRangeInt(this.minSpawnGroup, this.maxSpawnGroup + 1);

                const specialZone = JSON.stringify({ xMin: -800, xMax: -380, yMin: 5, yMax: 15 });
                const currentZone = JSON.stringify(zone);

                if (currentZone === specialZone) {
                    const startPos = new Vec3(math.randomRangeInt(zone.xMin, zone.xMax), math.randomRangeInt(zone.yMin, zone.yMax), 0);
                    const separation = 50;
                    for (let i = 0; i < numToSpawn; i++) {
                        const spawnPos = new Vec3(startPos.x, startPos.y + i * separation, 0);
                        if (this.enemyManager.getEnemyCount() < this.maxEnemies) {
                            this.spawnEnemy(spawnPos);
                        } else {
                            break;
                        }
                    }
                } else {
                    const startPos = new Vec3(math.randomRangeInt(zone.xMin, zone.xMax), math.randomRangeInt(zone.yMin, zone.yMax), 0);
                    const separation = 50;
                    for (let i = 0; i < numToSpawn; i++) {
                        const spawnPos = new Vec3(startPos.x + i * separation, startPos.y, 0);
                        if (this.enemyManager.getEnemyCount() < this.maxEnemies) {
                            this.spawnEnemy(spawnPos);
                        } else {
                            break;
                        }
                    }
                }
            }
        }
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

            // Cập nhật danh sách hàng rào trong EnemyManager
            this.enemyManager.setFences(this.fenceContainer.children);
        }
    }
}