// StateMonad performs the data furnishing operations of the application.
// State is replaced here safely, and it will not change it internally.
export type StateInitializer = any | StateMonad<any>;
interface StateMonad<State> {
	getState: () => State,
	setState: (newState: State) => void
}
class StateMonad<State> {
	constructor(state?: StateInitializer) {
		this.getState = () => state;
		this.setState = (newState) => { state = newState };
		if (state instanceof StateMonad)
			this.setState(state.getState())
		else
			this.setState(state);
	}
}
export default StateMonad;
export { StateMonad };