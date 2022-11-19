
export interface IForm {
	[inputs: string]: any;
	submitting: boolean;
	validate: () => boolean;
	body: () => any;
}
