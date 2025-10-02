// File: UIManager.ts
import { _decorator, Component, Label } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('UIManager')
export class UIManager extends Component {
    @property({type: Label})
    rubyCountLabel: Label = null!;

    @property({type: Label})
    coinCountLabel: Label = null!;

    public updateRubyLabel(count: number): void {
        this.rubyCountLabel.string = count.toString();
    }

    public updateCoinLabel(count: number): void {
        this.coinCountLabel.string = count.toString();
    }
}