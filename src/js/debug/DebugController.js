import { RESOURCE_TYPES } from "../constants/ResourceTypes.js";
import { DevCard } from "../models/devCards/DevCard.js";
import { DEV_CARD_TYPES } from "../constants/DevCardTypes.js";
import { StatusCodes } from "../constants/StatusCodes.js";

export class DebugController {
    // We pass the actual game state or engine to the commands
    constructor(gameController) {
        this.controller = gameController; // reference to the main game controller
        this.gameContext = gameController.gameContext; // shared game state

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
                player.addResources({ [type]: parseInt(qty) });

                return {
                    status: StatusCodes.SUCCESS,
                    gameContext: this.gameContext
                }
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
                    player.addResources({ [type]: amount });
                }
                return {
                    status: StatusCodes.SUCCESS,
                    gameContext: this.gameContext,
                    message: `Added ${amount} of all resources to Player ${playerIndex}`
                }
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
                return {
                    status: StatusCodes.SUCCESS,
                    gameContext: this.gameContext,
                    message: `Added ${amount} cheat VP to Player ${playerIndex}`
                }
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
                    return this.controller.discardCardAndActivateRobber(this.gameContext.currentState); // this will not change state after robber
                } else {
                    this.controller.distributeResourcesByRoll(diceValue);
                    return {
                        status: StatusCodes.SUCCESS,
                        gameContext: this.gameContext,
                        message: `Forced dice roll to ${diceValue}`
                    }
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
                    player.addDevCard(new DevCard(resolvedCardType, -1)); // set turnBought to -1 to avoid locked
                }

                return {
                    status: StatusCodes.SUCCESS,
                    gameContext: this.gameContext,
                    message: `Added ${amount} ${resolvedCardType} dev card(s) to Player ${playerIndex}`
                }
            },

            /**
             * refresh the debug HUD
             * @param {*} args 
             */
            refresh: (args) => {
                this.renderer.renderDebugHUD(this.gameContext, `Refreshed Debug HUD`);
            }
        };
    }



    parse(input) {
        const [cmd, ...args] = input.trim().split(/\s+/);
        const action = this.commands[cmd.toLowerCase()];
        console.log("Executing cheat command:", cmd, args);
        if (action){
            return action(args);
        }else{
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