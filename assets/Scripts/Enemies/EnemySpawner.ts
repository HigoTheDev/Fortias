import { _decorator, Component, Prefab, Node, instantiate, Vec3, math, input, Input } from 'cc';
import { EnemyManager } from './EnemyManager';
import { Fence } from "db://assets/Scripts/Props/Fence";
import { GoblinController } from './GoblinController';

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

    @property({ tooltip: "Số quái vật tối thiểu mỗi đợt ngẫu nhiên" })
    minSpawnGroup: number = 5;

    @property({ tooltip: "Số quái vật tối đa mỗi đợt ngẫu nhiên" })
    maxSpawnGroup: number = 20;

    @property({ tooltip: "Độ cao chênh lệch giữa các hàng trong đợt đầu tiên." })
    tierOffset: number = 120;

    @property({ type: Number, tooltip: "Vị trí Y của con Enemy đầu tiên." })
    firstEnemyY: number = 200;

    private timer: number = 0;
    private mapBounds = { xMin: -1000, xMax: -400, yMin: -800, yMax: 1000 };
    private minDistanceFromPlayer: number = 200;
    private hasGameStarted: boolean = false;

    private initialWaveControllers: GoblinController[] = [];

    start() {
        if (this.enemyManager && this.fenceContainer) {
            const fences = this.fenceContainer.children;
            for (const fence of fences) {
                fence.on(Fence.EVENT_DESTROYED, this.onFenceDestroyed, this);
            }
        } else {
            console.error("Lỗi: Vui lòng gán EnemyManager hoặc FenceContainer trong Inspector!");
        }

        this.spawnInitialWave();

        input.on(Input.EventType.MOUSE_DOWN, this.onFirstClick, this);
    }

    private onFirstClick() {
        if (this.hasGameStarted) {
            return;
        }

        console.log("Battle started! Activating initial wave...");
        this.hasGameStarted = true;
        input.off(Input.EventType.MOUSE_DOWN, this.onFirstClick, this);

        for (const controller of this.initialWaveControllers) {
            controller.activate();
        }
        this.initialWaveControllers = [];
    }

    private spawnInitialWave() {
        const enemiesPerColumn = 5;
        const columnXPositions = [-550, -650, -750];
        const ySpacing = 100;
        const staggerOffset = ySpacing / 2;

        const centerOfFirstColumn = this.firstEnemyY - ((enemiesPerColumn - 1) / 2) * ySpacing;

        for (let colIndex = 0; colIndex < columnXPositions.length; colIndex++) {
            const x = columnXPositions[colIndex];
            const tieredY = centerOfFirstColumn - (colIndex * this.tierOffset);
            const staggerY = (colIndex % 2 === 1 ? staggerOffset : 0);
            const columnCenterY = tieredY + staggerY;
            const startYForColumn = columnCenterY - ((enemiesPerColumn - 1) / 2) * ySpacing;

            for (let i = 0; i < enemiesPerColumn; i++) {
                const y = startYForColumn + (i * ySpacing);
                const spawnPos = new Vec3(x, y, 0);

                if (this.enemyManager.getEnemyCount() < this.maxEnemies) {
                    this.spawnEnemy(spawnPos, true);
                } else {
                    return;
                }
            }
        }
    }

    spawnEnemy(position: Vec3, isFromInitialWave: boolean = false) {
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

        const controller = enemy.getComponent(GoblinController);
        if (!controller) return;

        if (isFromInitialWave) {
            this.initialWaveControllers.push(controller);
        } else {
            controller.activate();
        }
    }

    update(deltaTime: number) {
        if (!this.hasGameStarted) {
            return;
        }

        this.timer += deltaTime;
        if (this.timer >= this.spawnInterval) {
            this.timer = 0;
            if (this.enemyManager.getEnemyCount() < this.maxEnemies) {
                const numToSpawn = math.randomRangeInt(this.minSpawnGroup, this.maxSpawnGroup + 1);
                for (let i = 0; i < numToSpawn; i++) {
                    let spawnPos: Vec3;
                    do {
                        spawnPos = new Vec3(
                            math.randomRangeInt(this.mapBounds.xMin, this.mapBounds.xMax),
                            math.randomRangeInt(this.mapBounds.yMin, this.mapBounds.yMax),
                            0
                        );
                    } while (!this.isValidSpawn(spawnPos));

                    if (this.enemyManager.getEnemyCount() < this.maxEnemies) {
                        this.spawnEnemy(spawnPos); // Enemy ngẫu nhiên sẽ tự kích hoạt
                    } else {
                        break;
                    }
                }
            }
        }
    }

    private isValidSpawn(pos: Vec3): boolean {
        const playerPos = new Vec3(0, 0, 0);
        return Vec3.distance(pos, playerPos) > this.minDistanceFromPlayer;
    }

    onFenceDestroyed(destroyedFencePos: Vec3) {
        if (this.fencePrefab) {
            const newFence = instantiate(this.fencePrefab);
            newFence.setPosition(destroyedFencePos);
            this.fenceContainer.addChild(newFence);
            newFence.on(Fence.EVENT_DESTROYED, this.onFenceDestroyed, this);
        }
    }
}