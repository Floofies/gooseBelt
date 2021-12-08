class StateMonad {
    constructor(state) {
        this.getState = () => state;
        this.setState = (newState) => { state = newState; };
        if (state instanceof StateMonad)
            this.setState(state.getState());
        else
            this.setState(state);
    }
}
export default StateMonad;
export { StateMonad };
