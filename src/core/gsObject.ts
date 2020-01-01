import {gsEscaping, IGsEventAtt, IGsEventNode} from "../../api/gs.js";
import {IGsList, IGsNode} from "../../api/gsObject.js";

export const GSO = {

	parse(gs: string): IGsList {
		return null;
	},

	stringify(gs: IGsList | IGsNode, options?: IGsoStringifyOptions): string {
		return null;
	}
};


export interface IGsoStringifyOptions {
	formattabeBody?: string[] | ((node: IGsEventNode) => boolean);
	formattabeValue?: string[] | ((node: IGsEventNode, att: IGsEventAtt) => boolean);
	mixedBody?: string[] | ((node: IGsEventNode) => boolean);
	escapingBody?: ((node: IGsEventNode) => gsEscaping);
	escapingValue?: ((node: IGsEventNode, att: IGsEventAtt) => gsEscaping);
	escapingName?: ((node: IGsEventNode) => gsEscaping);
	escapingAttName?: ((node: IGsEventNode, att: IGsEventAtt) => gsEscaping);
}
