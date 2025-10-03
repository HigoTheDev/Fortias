// File: GameManager.ts
import { _decorator, Component, Node } from 'cc';
import { UIManager } from "db://assets/Scripts/UIManager";

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    // --- Singleton Pattern ---
    private static _instance: GameManager = null;
    public static get instance(): GameManager {
        if (this._instance === null) {
            console.error("GameManager instance is not found!");
        }
        return this._instance;
    }

    @property(UIManager)
    uiManager: UIManager = null!;

    private _currentRubies: number = 0;
    private _currentCoins: number = 0;

    protected onLoad(): void {
        if (GameManager._instance === null) {
            GameManager._instance = this;
            // (Tùy chọn) Giữ cho GameManager tồn tại qua các scene
            // director.addPersistRootNode(this.node);
        } else {
            this.destroy();
            return;
        }
    }

    start() {
        // Khởi tạo giá trị ban đầu và cập nhật UI
        this.updateRubyCount(0);
        this.updateCoinCount(0);
    }

    public addRubies(amount: number): void {
        this.updateRubyCount(this._currentRubies + amount);
    }

    public removeRubies(amount: number): void {
        this.updateRubyCount(this._currentRubies - amount);
    }

    public addCoins(amount: number): void {
        this.updateCoinCount(this._currentCoins + amount);
    }

    private updateRubyCount(newValue: number): void {
        this._currentRubies = Math.max(0, newValue); // Đảm bảo không bị âm
        if (this.uiManager) {
            this.uiManager.updateRubyLabel(this._currentRubies);
        }
    }

    private updateCoinCount(newValue: number): void {
        this._currentCoins = Math.max(0, newValue);
        if (this.uiManager) {
            this.uiManager.updateCoinLabel(this._currentCoins);
        }
    }

    public getCurrentRubies(): number {
        return this._currentRubies;
    }

    public getCurrentCoins(): number {
        return this._currentCoins;
    }
}