Ext.define("stories-by-custom-field", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    config: {
        defaultSettings: {
            groupField: 'Iteration'
        }
    },

    modelName: 'HierarchicalRequirement',
    fetch: ['FormattedID','Name','ScheduleState','PlanEstimate','Feature','Iteration','Release','Blocked','Owner'],
    states: ['Defined','In-Progress','Completed','Accepted'],
    stateField: 'ScheduleState',

    groupingFieldTypeMapping: {
        iteration: {
            xtype: 'rallyiterationcombobox',
            storeConfig: {
                fetch: ['Name','StartDate','EndDate']
            }
        },
        release: {
            xtype: 'rallyreleasecombobox'
        }
    },

    items: [
        {xtype:'container',itemId:'selector_box'},
        {xtype:'container',itemId:'display_box'}
    ],
    launch: function() {
        Rally.data.ModelFactory.getModel({
            type: this.modelName,
            success: function(model) {
                this.model = model;
                model.getField(this.stateField).getAllowedValueStore().load({
                    callback: function(records, operation, success) {
                        this.logger.log('callback', records, operation, success);
                        if (success){
                            this.states = _.map(records, function(r){ return r.get('StringValue')});
                            this.logger.log('States: ', this.states);
                            this.addSelector();
                        } else {
                            Rally.ui.notify.Notifier.showError({message: "Error loading State field values: " + operation.error.errors.join(',')});
                        }
                    },
                    scope: this
                });
            },
            scope: this
        });
    },
    addSelector: function(){
        this.down('#selector_box').removeAll();
        var groupFieldConfig = this.getGroupingFieldControlConfig();
        groupFieldConfig.fieldLabel = this.model.getField(this.getGroupingField()).displayName;
        groupFieldConfig.labelAlign = 'right';
        groupFieldConfig.margin = '15 15 0 0';
        groupFieldConfig.width = 300;

        this.down('#selector_box').add(groupFieldConfig)
            .on('change', this.updateSummary, this);
    },
    updateSummary: function(cb){
        this.logger.log('updateSummary', cb);

        var fetch = this.fetch.concat([this.getGroupingField]),
            filters = this.getQueryFilter(cb);

        this.logger.log('updateSummary', fetch, filters);

        var store = Ext.create('Rally.data.wsapi.Store',{
            model: this.modelName,
            fetch: fetch,
            filters: filters,
            limit: 'Infinity'
        });
        store.load({
            callback: this.mungeModelData,
            scope: this
        });
    },

    mungeModelData: function(records, operation){
        this.logger.log('mungeModelData', records, operation);
        var summaryMunger = Ext.create('Rally.technicalservices.StorySummary',{}),
            stateData = summaryMunger.getStateSummaryData(this.states, records),
            issuesData = summaryMunger.getIssuesSummaryData(records);

        this.logger.log('mungeModelData data arrays', stateData, issuesData);

        this.down('#display_box').removeAll();
        this.addTable(stateData, summaryMunger.getStateColumnCfgs());
        this.addTable(issuesData, summaryMunger.getIssueColumnCfgs());

    },
    addTable: function(stateData, columnCfgs){
        var grid = Ext.create('Rally.ui.grid.Grid', {
            store: Ext.create('Rally.data.custom.Store', {
                data: stateData
            }),
            columnCfgs: columnCfgs,
            showPagingToolbar: false,
            padding: 25
        });
        this.down('#display_box').add(grid);
    },

    getQueryFilter: function(cmp){
        this.logger.log('getQueryFilter', cmp.getValue());
        var filters = Ext.create('Rally.data.wsapi.Filter',{
            property: 'DirectChildrenCount',
            value: 0
        });

        if (this.getGroupingField() === 'Iteration'){
            if (cmp.getValue()){
                this.logger.log('Iteration', cmp.getRecord().get('StartDate'))
                filters = filters.and({
                    property: 'Iteration.StartDate',
                    value: Rally.util.DateTime.toIsoString(cmp.getRecord().get('StartDate'))
                });
                filters = filters.and({
                    property: 'Iteration.EndDate',
                    value: Rally.util.DateTime.toIsoString(cmp.getRecord().get('EndDate'))
                });
                return filters.and({
                    property: 'Iteration.Name',
                    value: cmp.getRecord().get('name') || cmp.getRecord().get('Name')
                });
            } else {
                return filters.and({
                    property: 'Iteration',
                    value: ""
                });
            }
        }
        if (this.getGroupingField() === 'Release'){
            if (cmp.getValue()){
                filters = filters.and({
                    property: 'Release.ReleaseStartDate',
                    value: Rally.util.DateTime.toIsoString(cmp.getRecord().get('ReleaseStartDate'))
                });
                filters = filters.and({
                    property: 'Release.ReleaseDate',
                    value: Rally.util.DateTime.toIsoString(cmp.getRecord().get('ReleaseDate'))
                });
                return filters.and({
                    property: 'Release.Name',
                    value: cmp.getRecord().get('Name')
                });
            } else {
                return filters.and({
                    property: 'Release',
                    value: ""
                });
            }
        }
        if (cmp.getValue()){
            return filters.and({
                property: this.getGroupingField(),
                value: cmp.getValue()
            });
        }
        return filters.and({
            property: this.getGroupingField(),
            value: ''
        });
    },
    getGroupingField: function(){
        return this.getSetting('groupField');
    },
    getGroupingFieldControlConfig: function(){
        this.logger.log('getGroupingFieldControlConfig',this.groupingFieldTypeMapping[this.getGroupingField()])
        return this.groupingFieldTypeMapping[this.getGroupingField().toLowerCase()] || this.getDefaultGroupingFieldConfig();
    },
    getDefaultGroupingFieldConfig: function(){
        return {
            xtype: 'rallyfieldvaluecombobox',
            model: this.modelName,
            valueField: 'value',
            field: this.getGroupingField()
        };
    },
    getSettingsFields: function(){
        return Rally.technicalservices.Settings.getFields(this.modelName)
    },
    getOptions: function() {
        return [
            {
                text: 'About...',
                handler: this._launchInfo,
                scope: this
            }
        ];
    },
    
    _launchInfo: function() {
        if ( this.about_dialog ) { this.about_dialog.destroy(); }
        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink',{});
    },
    
    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    },
    
    //onSettingsUpdate:  Override
    onSettingsUpdate: function (settings){
        this.logger.log('onSettingsUpdate',settings);
        Ext.apply(this, settings);
        this.launch();
    }
});
