import { _decorator, Component, Enum } from "cc";
const { ccclass, property } = _decorator;

export enum CurrencyType {
    Gold,
    Diamond
}

@ccclass("Currency")
export class Currency extends Component {
    @property({ type: Enum(CurrencyType) })
    type: CurrencyType = CurrencyType.Gold;

    @property
    value: number = 1;

    public collected: boolean = false;
}
