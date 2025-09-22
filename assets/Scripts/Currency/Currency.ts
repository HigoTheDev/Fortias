import { _decorator, Component } from "cc";
const { ccclass, property } = _decorator;

export enum CurrencyType {
    Gold,
    Diamond
}

@ccclass("Currency")
export class Currency extends Component {
    @property({ type: CurrencyType })
    type: CurrencyType = CurrencyType.Gold;

    @property
    value: number = 1;
}
