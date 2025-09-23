import { _decorator, Component, Node } from 'cc';
import { GoblinController } from './GoblinController';
const { ccclass, property } = _decorator;

@ccclass('EnemyManager')
export class EnemyManager extends Component {

    private enemies: Node[] = [];

    addEnemy(enemy: Node) {
        this.enemies.push(enemy);

        enemy.once(Node.EventType.NODE_DESTROYED, () => {
            this.removeEnemy(enemy);
        });
    }

    removeEnemy(enemy: Node) {
        // 🔥 SỬA LỖI: Thêm dòng kiểm tra này để tránh lỗi khi đóng scene
        // Nếu mảng enemies không tồn tại (đã bị hủy), không làm gì cả.
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

    clearAllEnemies() {
        for (let enemy of this.enemies) {
            enemy.destroy();
        }
        this.enemies = [];
    }
}