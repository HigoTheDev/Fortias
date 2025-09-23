import { _decorator, Component, Node, Label, Collider2D, IPhysics2DContact, Prefab, instantiate, Vec3 } from "cc";
import { CurrencyManager } from "../Currency/CurrencyManager";
import { CurrencyType } from "../Currency/Currency";
import { PlayerSpine } from "../Player/PlayerSpine"; // ✅ import thẳng class

const { ccclass, property } = _decorator;

// @ts-ignore
@ccclass("NPC")
export class NPC extends Component {
    @property(Label)
    diamondLabel: Label = null!;

    @property(Node)
    bubble: Node = null!;

    @property
    requiredDiamonds: number = 5;

    @property(Prefab)
    goldPrefab: Prefab = null!;

    @property(Node)
    table: Node = null!;

    @property(Node)
    tradeZone: Node = null!;

    private goldOffset: number = 0;
    private currencyManager: CurrencyManager | null = null;

    start() {
        this.updateBubble();

        if (this.tradeZone) {
            const collider = this.tradeZone.getComponent(Collider2D);
            if (collider) {
                collider.on("onBeginContact", this.onEnterTradeZone, this);
            }
        }
    }

    private updateBubble() {
        if (this.requiredDiamonds <= 0) {
            if (this.bubble) this.bubble.active = false;
            return;
        }
        if (this.diamondLabel) {
            this.diamondLabel.string = this.requiredDiamonds.toString();
        }
    }

    private onEnterTradeZone(self: Collider2D, other: Collider2D, contact: IPhysics2DContact | null) {
        console.log("Collision detected with:", other.node.name);

        const player = other.node.getComponent(PlayerSpine)
            || other.node.parent?.getComponent(PlayerSpine);

        console.log("Player found:", player ? "YES" : "NO");
        if (!player) return;

        if (!this.currencyManager) {
            this.currencyManager = player.currencyManager;
        }

        console.log("Currency Manager:", this.currencyManager ? "FOUND" : "NOT FOUND");
        if (this.currencyManager) {
            console.log("Diamonds available:", this.currencyManager.getDiamond());
        }
        console.log("Required diamonds:", this.requiredDiamonds);

        this.trade();
    }

    private trade() {
        console.log("🔄 Trade started");

        if (!this.currencyManager) {
            console.log("❌ No currency manager");
            return;
        }

        let diamondsAvailable = this.currencyManager.getDiamond();
        console.log(`💎 Available: ${diamondsAvailable}, Required: ${this.requiredDiamonds}`);

        let tradeCount = 0;

        while (this.requiredDiamonds > 0 && diamondsAvailable > 0) {
            // trừ diamond
            this.currencyManager.addCurrency(CurrencyType.Diamond, -1);
            this.requiredDiamonds--;
            diamondsAvailable--;

            // spawn gold
            if (this.goldPrefab && this.table) {
                const gold = instantiate(this.goldPrefab);
                this.goldOffset += 30;
                gold.setParent(this.table);
                gold.setPosition(new Vec3(0, this.goldOffset, 0));
                console.log("🏆 Gold spawned at offset:", this.goldOffset);
            } else {
                console.log("❌ Missing goldPrefab or table");
            }
        }
        this.updateBubble();
    }


}
