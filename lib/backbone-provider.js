const React = require('react');
const { Component, Children } = React;
const PropTypes = require('prop-types');

const { Provider } = require('./context');

class BackboneProvider extends Component {
  render() {
    return (
      <Provider value={this.props.models}>
        {Children.only(this.props.children)}
      </Provider>
    );
  }
}

BackboneProvider.propTypes = {
  models: PropTypes.object,
  children: PropTypes.element.isRequired,
};
BackboneProvider.displayName = 'BackboneProvider';

module.exports = BackboneProvider;
