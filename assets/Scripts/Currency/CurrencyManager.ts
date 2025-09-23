import { _decorator, Component, Label } from "cc";
import { CurrencyType } from "./Currency";
const { ccclass, property } = _decorator;

@ccclass("CurrencyManager")
export class CurrencyManager extends Component {
    @property(Label) goldLabel: Label = null!;
    @property(Label) diamondLabel: Label = null!;

    private gold: number = 0;
    private diamond: number = 0;

    public addGold(amount: number) {
        this.gold += amount;
        this.updateUI();
    }

    public addDiamond(amount: number) {
        this.diamond += amount;
        this.updateUI();
    }

    // 👇 hàm mới: dùng chung cho PlayerSpine gọi
    public addCurrency(type: CurrencyType, amount: number) {
        if (type === CurrencyType.Gold) {
            this.gold += amount;
        } else if (type === CurrencyType.Diamond) {
            this.diamond += amount;
        }
        this.updateUI();
    }

    private updateUI() {
        this.goldLabel.string = this.gold.toString();
        this.diamondLabel.string = this.diamond.toString();
    }
}
