import { _decorator, Component, Prefab, Node, instantiate, Vec3, math } from 'cc';
import { EnemyManager } from './EnemyManager';
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

    @property
    spawnInterval: number = 3;

    @property
    maxEnemies: number = 10;

    @property({ tooltip: "Số quái vật tối thiểu mỗi đợt" })
    minSpawnGroup: number = 5;

    @property({ tooltip: "Số quái vật tối đa mỗi đợt" })
    maxSpawnGroup: number = 8;

    private timer: number = 0;

    start() {
        if (this.enemyManager && this.fenceContainer) {
            const fences = this.fenceContainer.children;
            this.enemyManager.setFences(fences);
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
                    { xMin: 50, xMax: 500, yMin: -5, yMax: 8 },
                    { xMin: -800, xMax: -380, yMin: 5, yMax: 15 },
                    { xMin: -160, xMax: -140, yMin: 400, yMax: 700 },
                    { xMin: -200, xMax: -150, yMin: -500, yMax: -300 }
                ];

                const zone = spawnZones[math.randomRangeInt(0, 4)];
                const numToSpawn = math.randomRangeInt(this.minSpawnGroup, this.maxSpawnGroup + 1);

                for (let i = 0; i < numToSpawn; i++) {
                    const randomX = math.randomRangeInt(zone.xMin, zone.xMax);
                    const randomY = math.randomRangeInt(zone.yMin, zone.yMax);
                    const pos = new Vec3(randomX, randomY, 0);

                    const offsetX = math.randomRangeInt(-20, 20);
                    const offsetY = math.randomRangeInt(-20, 20);
                    const spawnPos = pos.add(new Vec3(offsetX, offsetY, 0));

                    if (this.enemyManager.getEnemyCount() < this.maxEnemies) {
                        this.spawnEnemy(spawnPos);
                    } else {
                        break;
                    }
                }
            }
        }
    }

    spawnEnemy(position: Vec3) {
        if(this.enemyPrefab == null) return;
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
}