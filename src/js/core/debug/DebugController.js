import { RESOURCE_TYPES } from "../../constants/ResourceTypes.js";
import { createDevCard } from "../../factories/devCardFactory.js";
import { DEV_CARD_TYPES } from "../../constants/DevCardTypes.js";
import { StatusCodes } from "../../constants/StatusCodes.js";
import { GameRules } from "../../logic/GameRules.js";

import { PlayerUtils } from "../../utils/PlayerUtils.js";

export class DebugController {
    // We pass the actual game state or engine to the commands
    constructor(debugClient) {
        this.debugClient = debugClient;
        this.controller = debugClient.gameController; // reference to the main game controller
        this.gameContext = this.controller.gameContext; // shared game state

        this.CHEAT_CARD_MAP = {
            "kt": DEV_CARD_TYPES.KNIGHT,
            "knight": DEV_CARD_TYPES.KNIGHT,

            "rb": DEV_CARD_TYPES.ROAD_BUILDING,
            "br": DEV_CARD_TYPES.ROAD_BUILDING,

            "vp": DEV_CARD_TYPES.VICTORY_POINT,

            "mn": DEV_CARD_TYPES.MONOPOLY,
            "mono": DEV_CARD_TYPES.MONOPOLY,

            "yp": DEV_CARD_TYPES.YEAR_OF_PLENTY,
            "yop": DEV_CARD_TYPES.YEAR_OF_PLENTY
        };

        // cheat commands
        this.commands = {
            /**
             * Add a resource to a player, or to the current player if none specified
             * res <resourceType> <quantity> [playerIndex]
             * @param {*} args 
             */
            res: (args) => {
                const [type, qty, pIdx] = args;
                const playerIndex = pIdx !== undefined ? parseInt(pIdx) : this.gameContext.currentPlayerIndex;
                const player = this.gameContext.players[playerIndex];
                // check if resource type is valid
                if (!Object.values(RESOURCE_TYPES).includes(type)) {
                    this.controller._broadcast({
                        type: 'INVALID_CHEAT_COMMAND',
                        payload: {
                            activePlayerId: player.id,
                        }
                    });
                    return;
                }

                PlayerUtils.addResources(player, { [type]: parseInt(qty) });
                this.controller._broadcast({
                    type: 'CHEAT_RESOURCES_ADDED',
                    payload: {
                        activePlayerId: player.id,
                    }
                });
            },

            /**
             * Add all resources to a player, or to the current player if none specified
             * allres <quantity> [playerIndex]
             * @param {*} args 
             */
            allres: (args) => {
                const [qty, pIdx] = args;
                const amount = parseInt(qty);
                const playerIndex = pIdx !== undefined ? parseInt(pIdx) : this.gameContext.currentPlayerIndex;
                if (!this.isValidPlayerIndex(playerIndex)) {
                    return {
                        status: StatusCodes.ERROR,
                        error_message: `Invalid player index: ${playerIndex}`
                    }
                }
                const player = this.gameContext.players[playerIndex];
                for (const type of Object.values(RESOURCE_TYPES)) {
                    PlayerUtils.addResources(player, { [type]: amount });
                }
                this.controller._broadcast({
                    type: 'CHEAT_RESOURCES_ADDED',
                    payload: {
                        activePlayerId: player.id,
                    }
                });
            },

            /**
             * Set victory points for a player, or for the current player if none specified
             * Note: this is implemented to add as a bonus cheat VP since VP are calculated dynamically
             * vp <amount> [playerIndex]
             * @param {*} args 
             */
            vp: (args) => {
                const [amount, pIdx] = args;
                const playerIndex = pIdx !== undefined ? parseInt(pIdx) : this.gameContext.currentPlayerIndex;
                if (!this.isValidPlayerIndex(playerIndex)) {
                    return {
                        status: StatusCodes.ERROR,
                        error_message: `Invalid player index: ${playerIndex}`
                    }
                }
                const player = this.gameContext.players[playerIndex];
                player.achievements.cheatVP += parseInt(amount);
                this.controller._broadcast({
                    type: 'CHEAT_VICTORY_POINTS_ADDED',
                    payload: {
                        activePlayerId: player.id,
                    }
                });
            },

            /**
             * force a dice roll to a specific value
             * roll <value>
             * @param {*} args 
             */
            roll: (args) => {
                const [value] = args;
                const diceValue = parseInt(value);

                if (diceValue < 2 || diceValue > 12) {
                    return {
                        status: StatusCodes.ERROR,
                        error_message: `Invalid dice value: ${diceValue}`
                    }
                }

                if (diceValue === 7) {
                    this.controller.returnStateAfterRob = this.controller.gameContext.currentState;
                    this.controller.discardInfo = []; // reset discard info
                    this.controller.discardInfo = GameRules.getDiscardInfo(this.controller.gameContext);
                    this.controller._handleDiscardOrMoveRobber();
                } else {
                    this.controller._distributeResourcesByRoll(diceValue);
                    this.controller._broadcast({
                        type: 'CHEAT_DICE_ROLLED',
                        payload: {
                            rolledValue: diceValue
                        }
                    });
                }
            },

            rob: (args) => {
                const [tileId, targetPlayerIndex] = args;
                return this.controller.activateRobber(this.gameContext.currentState); // this will not change state after robber
            },

            /**
             * directly add a development card to a player, or to the current player if none specified
             * dev <cardType> <amount> [playerIndex]
             * @param {*} args casrdType kt, vp, rb, mono, yop
             * @returns 
             */
            dev: (args) => {
                const [cardType, amount, pIdx] = args;
                const playerIndex = pIdx !== undefined ? parseInt(pIdx) : this.gameContext.currentPlayerIndex;

                // cehck card type
                const resolvedCardType = this.CHEAT_CARD_MAP[cardType.toLowerCase()];
                if (!resolvedCardType) {
                    return {
                        status: StatusCodes.ERROR,
                        error_message: `Invalid dev card type: ${cardType}`
                    }
                }

                // check player 
                if (!this.isValidPlayerIndex(playerIndex)) {
                    return {
                        status: StatusCodes.ERROR,
                        error_message: `Invalid player index: ${playerIndex}`
                    };
                }

                const amountInt = parseInt(amount);
                if (isNaN(amountInt) || amountInt <= 0) {
                    return {
                        status: StatusCodes.ERROR,
                        error_message: `Invalid amount: ${amount}`
                    }
                }

                // cheat add dev card
                const player = this.gameContext.players[playerIndex];
                for (let i = 0; i < amountInt; i++) {
                    PlayerUtils.addDevCard(player, createDevCard(resolvedCardType, -1)); // set turnBought to -1 to avoid locked
                }

                this.controller._broadcast({
                    type: 'CHEAT_DEV_CARD_ADDED',
                    payload: {
                        activePlayerId: this.gameContext.players[playerIndex].id,
                        cardType: resolvedCardType,
                        amount: amountInt
                    }
                });
            },

            /**
             * refresh the debug HUD
             * @param {*} args 
             */
            refresh: (args) => {
                this.debugClient.updateDashboard(`Refreshed Debug HUD`);
            }
        };
    }



    execute(input) {
        const [cmd, ...args] = input.trim().split(/\s+/);
        const action = this.commands[cmd.toLowerCase()];
        console.log("Executing cheat command:", cmd, args);
        if (action) {
            return action(args);
        } else {
            return {
                status: StatusCodes.ERROR,
                error_message: `Unknown command: ${cmd}`
            }
        }
    }

    isValidPlayerIndex(index) {
        return index >= 0 && index < this.gameContext.players.length;
    }
};