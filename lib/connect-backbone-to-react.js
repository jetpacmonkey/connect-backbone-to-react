const hoistStatics = require('hoist-non-react-statics');
const { Component, PropTypes, createElement } = require('react');
const debounceFn = require('lodash.debounce');
const isArray = require('lodash.isarray');

function getDisplayName(name) {
  return `connectBackboneToReact(${name})`;
}

function defaultMapModelsToProps(models) {
  return Object.keys(models).reduce((acc, modelKey) => {
    const model = models[modelKey];
    acc[modelKey] = model.toJSON();
    return acc;
  }, {});
}

module.exports = function connectBackboneToReact(
  mapModelsToProps,
  options = {}
) {
  if (typeof mapModelsToProps !== 'function') {
    mapModelsToProps = defaultMapModelsToProps;
  }

  const {
    debounce = false,
    events = {},
    modelTypes = {},
  } = options;

  function getEventNames(modelName) {
    let eventNames = events[modelName];

    // Allow turning off event handlers by setting events to false.
    if (eventNames === false) {
      return [];
    }

    if (!isArray(eventNames)) {
      eventNames = [];
    }

    if (eventNames.length === 0) {
      eventNames.push('all');
    }

    return eventNames;
  }

  function validateModelTypes(modelsMap) {
    return Object.keys(modelTypes).forEach(modelKey => {
      const ModelConstructor = modelTypes[modelKey];
      const modelInstance = modelsMap[modelKey];

      const isInstanceOfModel = modelInstance instanceof ModelConstructor;
      if (!isInstanceOfModel) {
        throw new Error(`"${modelKey}" model found on modelsMap does not match type required.`);
      }
    });
  }

  return function createWrapper(WrappedComponent) {
    const wrappedComponentName = WrappedComponent.displayName
      || WrappedComponent.name
      || 'Component';

    const displayName = getDisplayName(wrappedComponentName);

    class Connect extends Component {
      constructor(props, context) {
        super(props, context);

        this.modelsMap = props.models || context.models;

        validateModelTypes(this.modelsMap);

        this.state = this.mapModelsToProps();

        this.createNewProps = this.createNewProps.bind(this);

        if (debounce) {
          const debounceWait = typeof debounce === 'number' ? debounce : 0;
          this.createNewProps = debounceFn(this.createNewProps, debounceWait);
        }

        this.createEventListeners();
      }

      createEventListeners() {
        Object.keys(this.modelsMap).forEach(mapKey => {
          const model = this.modelsMap[mapKey];

          getEventNames(mapKey).forEach(name => {
            model.on(name, this.createNewProps, this);
          });
        });
      }

      createNewProps() {
        this.setState(this.mapModelsToProps());
      }

      componentWillUnmount() {
        if (debounce) {
          this.createNewProps.cancel();
        }

        Object.keys(this.modelsMap).forEach(mapKey => {
          const model = this.modelsMap[mapKey];

          getEventNames(mapKey).forEach(name => {
            model.off(name, this.createNewProps, this);
          });
        });
      }

      mapModelsToProps() {
        return mapModelsToProps(this.modelsMap);
      }

      render() {
        const wrappedProps = Object.assign(
          {},
          this.state,
          this.props
        );

        // Don't pass through models prop.
        wrappedProps.models = undefined;

        return createElement(WrappedComponent, wrappedProps);
      }
    }

    const propTypes = {
      models: PropTypes.object,
    };

    Connect.WrappedComponent = WrappedComponent;
    Connect.displayName = displayName;
    Connect.propTypes = propTypes;
    Connect.contextTypes = propTypes;

    return hoistStatics(Connect, WrappedComponent);
  };
};