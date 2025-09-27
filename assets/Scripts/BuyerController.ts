// File: BuyerController.ts
import { _decorator, Component, Node, Vec3 } from 'cc';
import { BuyerManager } from './BuyerManager';
import { DropZoneController } from './DropZoneController';

const { ccclass, property } = _decorator;

enum BuyerState {
    MOVING,
    WAITING,
    BUYING,
}

@ccclass('BuyerController')
export class BuyerController extends Component {
    @property
    moveSpeed: number = 100;

    private state: BuyerState = BuyerState.MOVING;
    private manager: BuyerManager = null!;
    private tableDropZone: DropZoneController = null!;

    private patrolPoints: Node[] = [];
    private currentTarget: Vec3 = null!;
    private currentStage: 'QUEUE' | 'EXIT' = 'QUEUE';
    private isAtFront: boolean = false;

    private rubiesToBuy: number = 0;
    private originalScaleX: number = 1;

    start() {
        this.originalScaleX = this.node.scale.x;
    }

    public init(manager: BuyerManager, points: Node[], table: DropZoneController) {
        this.manager = manager;
        this.patrolPoints = points;
        this.tableDropZone = table;
        this.rubiesToBuy = Math.floor(Math.random() * (4 - 2 + 1)) + 2;
    }

    public moveTo(targetPos: Vec3, isAtFront: boolean) {
        this.currentTarget = targetPos;
        this.isAtFront = isAtFront;
        this.state = BuyerState.MOVING;
        this.currentStage = 'QUEUE';
    }

    public continuePatrol() {
        this.currentStage = 'EXIT';
        this.currentTarget = this.patrolPoints[1].worldPosition; // Nhắm đến P3
        this.state = BuyerState.MOVING;
    }

    update(deltaTime: number) {
        if (this.state !== BuyerState.MOVING || !this.currentTarget) {
            return;
        }

        if (Vec3.distance(this.node.worldPosition, this.currentTarget) < 5) {
            this.handleArrival();
        } else {
            this.moveTowards(this.currentTarget, deltaTime);
        }
    }

    private handleArrival() {
        this.node.setWorldPosition(this.currentTarget);
        this.state = BuyerState.WAITING;

        if (this.currentStage === 'QUEUE') {
            if (this.isAtFront) {
                this.startBuying();
            }
        } else { // Đang trong giai đoạn 'EXIT'
            if (this.currentTarget.equals(this.patrolPoints[1].worldPosition)) { // Vừa đến P3
                this.currentTarget = this.patrolPoints[2].worldPosition; // Đi tiếp P4
                this.state = BuyerState.MOVING;
            }
            else if (this.currentTarget.equals(this.patrolPoints[2].worldPosition)) { // Vừa đến P4
                this.manager.onBuyerLeftScene(this.node);
                this.destroy();
            }
        }
    }

    private startBuying() {
        this.isAtFront = false;
        this.state = BuyerState.BUYING;
        this.buyingLoop();
    }

    private buyingLoop() {
        if (this.rubiesToBuy <= 0) {
            this.manager.onBuyerFinishedShopping(this.node);
            return;
        }

        if (this.tableDropZone.hasRubies()) {
            this.tableDropZone.takeRuby();
            this.rubiesToBuy--;
            this.scheduleOnce(() => { this.buyingLoop(); }, 0.5);
        } else {
            this.scheduleOnce(() => {
                if (this.state === BuyerState.BUYING) {
                    this.buyingLoop();
                }
            }, 2.0);
        }
    }

    private moveTowards(targetPos: Vec3, deltaTime: number) {
        const direction = new Vec3();
        Vec3.subtract(direction, targetPos, this.node.worldPosition);
        direction.normalize();
        if (direction.x > 0) this.node.setScale(this.originalScaleX, this.node.scale.y, this.node.scale.z);
        else if (direction.x < 0) this.node.setScale(-this.originalScaleX, this.node.scale.y, this.node.scale.z);
        this.node.translate(direction.multiplyScalar(this.moveSpeed * deltaTime));
    }
}