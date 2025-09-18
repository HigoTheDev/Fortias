import { _decorator, Component, Node } from 'cc';
import { GoblinController } from './GoblinController';
const { ccclass, property } = _decorator;

@ccclass('EnemyManager')
export class EnemyManager extends Component {

    private enemies: Node[] = [];
    private fences: Node[] = [];

    setFences(fences: Node[]) {
        this.fences = fences;
    }

    addEnemy(enemy: Node){
        this.enemies.push(enemy);

        const goblinScript = enemy.getComponent(GoblinController);
        if (goblinScript) {
            console.log("EnemyManager: Passing " + this.fences.length + " fences to a new goblin.");
            goblinScript.setFences(this.fences);
        }

        enemy.once(Node.EventType.NODE_DESTROYED, () => {
            this.removeEnemy(enemy);
        });
    }

    removeEnemy(enemy: Node) {
        // const index = this.enemies.indexOf(enemy);
        // if(index !== -1) {
        //     this.enemies.splice(index, 1);
        // }
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
}