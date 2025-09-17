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

    @property
    spawnInterval: number = 3;

    @property
    maxEnemies: number = 10;

    private timer: number = 0;

    update(deltaTime: number) {
        this.timer += deltaTime;
        if (this.timer >= this.spawnInterval) {
            this.timer = 0;

            if (this.enemyManager.getEnemyCount() < this.maxEnemies) {
                const randomX = math.randomRangeInt(-300, 300);
                const randomY = math.randomRangeInt(-200, 200);
                const pos = new Vec3(randomX, randomY, 0);

                this.spawnEnemy(pos);
            }
        }
    }

    spawnEnemy(position: Vec3) {
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
