import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('EnemyManager')
export class EnemyManager extends Component {

    private enemies: Node[] = [];

    addEnemy(enemy: Node){
        this.enemies.push(enemy);

        enemy.once(Node.EventType.NODE_DESTROYED, () => {
            this.removeEnemy(enemy);
        });
    }

    removeEnemy(enemy: Node) {
        const index = this.enemies.indexOf(enemy);
        if(index !== -1) {
            this.enemies.splice(index, 1);
        }
    }

    getEnemyCount(): number {
        return this.enemies.length;
    }

    clearAllEnemies() {
        for(let enemy of this.enemies) {
            enemy.destroy();
        }
        this.enemies = [];
    }

    commandAllEnemies(action: string) {
        for(let enemy of this.enemies) {
            if(enemy.getComponent("Enemy")) {
                (enemy.getComponent("Enemy") as any).doAction(action);
            }
        }
    }
}


