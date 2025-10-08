import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('EnemyManager')
export class EnemyManager extends Component {
    public static instance: EnemyManager = null;
    private enemies: Node[] = [];
    onLoad() {
        if (EnemyManager.instance === null) {
            EnemyManager.instance = this;
        } else {
            this.destroy();
            return;
        }
    }

    addEnemy(enemy: Node) {
        this.enemies.push(enemy);

        enemy.once(Node.EventType.NODE_DESTROYED, () => {
            this.removeEnemy(enemy);
        });
    }

    removeEnemy(enemy: Node) {
        if (!this.enemies) {
            return;
        }

        const index = this.enemies.indexOf(enemy);
        if (index !== -1) {
            this.enemies.splice(index, 1);
        }
    }

    getEnemyCount(): number {
        return this.enemies.length;
    }

    public getActiveEnemies(): readonly Node[] {
        return this.enemies;
    }

    clearAllEnemies() {
        const enemiesToDestroy = [...this.enemies];
        for (let enemy of enemiesToDestroy) {
            enemy.destroy();
        }
        this.enemies = [];
    }
}