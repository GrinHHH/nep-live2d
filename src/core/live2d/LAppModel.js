//============================================================
//============================================================
//  class LAppModel     extends L2DBaseModel
//============================================================
//============================================================
function LAppModel() {
    //L2DBaseModel.apply(this, arguments);
    L2DBaseModel.prototype.constructor.call(this);

    this.modelHomeDir = '';
    this.modelSetting = null;
    this.tmpMatrix = [];

    this.motionQueue = [];
}

LAppModel.prototype = new L2DBaseModel();

LAppModel.prototype.load = function(gl, modelSettingPath, callback) {
    this.setUpdating(true);
    this.setInitialized(false);

    this.modelHomeDir = modelSettingPath.substring(0, modelSettingPath.lastIndexOf('/') + 1);

    this.modelSetting = new ModelSettingJson();

    var thisRef = this;

    this.modelSetting.loadModelSetting(modelSettingPath, function() {
        var path = parsePath(thisRef.modelHomeDir, thisRef.modelSetting.getModelFile());
        thisRef.loadModelData(path, function(model) {
            for (var i = 0; i < thisRef.modelSetting.getTextureNum(); i++) {
                var texPaths = parsePath(thisRef.modelHomeDir, thisRef.modelSetting.getTextureFile(i));

                thisRef.loadTexture(i, texPaths, function() {
                    if (thisRef.isTexLoaded) {
                        if (thisRef.modelSetting.getExpressionNum() > 0) {
                            thisRef.expressions = {};

                            for (var j = 0; j < thisRef.modelSetting.getExpressionNum(); j++) {
                                var expName = thisRef.modelSetting.getExpressionName(j);
                                var expFilePath = parsePath(
                                    thisRef.modelHomeDir,
                                    thisRef.modelSetting.getExpressionFile(j),
                                );

                                thisRef.loadExpression(expName, expFilePath);
                            }
                        } else {
                            thisRef.expressionManager = null;
                            thisRef.expressions = {};
                        }

                        if (!thisRef.eyeBlink) {
                            //thisRef.eyeBlink = new L2DEyeBlink();
                        }

                        if (thisRef.modelSetting.getPhysicsFile()) {
                            thisRef.loadPhysics(parsePath(thisRef.modelHomeDir, thisRef.modelSetting.getPhysicsFile()));
                        } else {
                            thisRef.physics = null;
                        }

                        if (thisRef.modelSetting.getPoseFile()) {
                            thisRef.loadPose(
                                parsePath(thisRef.modelHomeDir, thisRef.modelSetting.getPoseFile()),
                                function() {
                                    thisRef.pose.updateParam(thisRef.live2DModel);
                                },
                            );
                        } else {
                            thisRef.pose = null;
                        }

                        thisRef.subtitles = [];
                        if (thisRef.modelSetting.getSubtitleFile())
                            thisRef.loadSubtitles(
                                parsePath(thisRef.modelHomeDir, thisRef.modelSetting.getSubtitleFile()),
                            );

                        if (thisRef.modelSetting.getLayout()) {
                            var layout = thisRef.modelSetting.getLayout();
                            if (layout['width']) thisRef.modelMatrix.setWidth(layout['width']);
                            if (layout['height']) thisRef.modelMatrix.setHeight(layout['height']);

                            if (layout['x']) thisRef.modelMatrix.setX(layout['x']);
                            if (layout['y']) thisRef.modelMatrix.setY(layout['y']);
                            if (layout['center_x']) thisRef.modelMatrix.centerX(layout['center_x']);
                            if (layout['center_y']) thisRef.modelMatrix.centerY(layout['center_y']);
                            if (layout['top']) thisRef.modelMatrix.top(layout['top']);
                            if (layout['bottom']) thisRef.modelMatrix.bottom(layout['bottom']);
                            if (layout['left']) thisRef.modelMatrix.left(layout['left']);
                            if (layout['right']) thisRef.modelMatrix.right(layout['right']);
                        }

                        for (var j = 0; j < thisRef.modelSetting.getInitParamNum(); j++) {
                            thisRef.live2DModel.setParamFloat(
                                thisRef.modelSetting.getInitParamID(j),
                                thisRef.modelSetting.getInitParamValue(j),
                            );
                        }

                        for (var j = 0; j < thisRef.modelSetting.getInitPartsVisibleNum(); j++) {
                            thisRef.live2DModel.setPartsOpacity(
                                thisRef.modelSetting.getInitPartsVisibleID(j),
                                thisRef.modelSetting.getInitPartsVisibleValue(j),
                            );
                        }

                        thisRef.live2DModel.saveParam();
                        // thisRef.live2DModel.setGL(gl);

                        MyTools.loadTimingMotions(thisRef.modelSetting.getMotions(LAppDefine.MOTION_GROUP_TIMING));

                        thisRef.preloadMotionGroup(LAppDefine.MOTION_GROUP_IDLE);
                        thisRef.mainMotionManager.stopAllMotions();

                        thisRef.setUpdating(false);
                        thisRef.setInitialized(true);

                        if (typeof callback === 'function') callback();
                    }
                });
            }
        });
    });
};

LAppModel.prototype.release = function(gl) {
    // this.live2DModel.deleteTextures();
    var pm = Live2DFramework.getPlatformManager();

    gl.deleteTexture(pm.texture);
};

LAppModel.prototype.preloadMotionGroup = function(name) {
    var thisRef = this;

    var motions = this.modelSetting.getMotions(name);

    for (var i = 0; i < motions.length; i++) {
        var file = this.modelSetting.getMotionFile(name, i);
        (function(i) {
            thisRef.loadMotion(file, parsePath(thisRef.modelHomeDir, file), function(motion) {
                motion.setFadeIn(thisRef.modelSetting.getMotionFadeIn(name, i));
                motion.setFadeOut(thisRef.modelSetting.getMotionFadeOut(name, i));
            });
        })(i);
    }
};

LAppModel.prototype.update = function() {
    // console.log("--> LAppModel.update()");

    if (this.live2DModel == null) {
        if (LAppDefine.DEBUG_LOG) console.error('Failed to update.');

        return;
    }

    var timeMSec = UtSystem.getUserTimeMSec() - this.startTimeMSec;
    var timeSec = timeMSec / 1000.0;
    var t = timeSec * 2 * Math.PI;

    if (this.mainMotionManager.isFinished()) {
        if (this.motionQueue.length > 0) {
            var m = this.motionQueue.shift();
            this.startMotion(m.name, m.no, LAppDefine.PRIORITY_NORMAL);
        } else {
            this.startRandomMotion(
                MyTools.altIdleAvailable && MyTools.altIdleEnabled
                    ? LAppDefine.MOTION_GROUP_ALT_IDLE
                    : LAppDefine.MOTION_GROUP_IDLE,
                LAppDefine.PRIORITY_IDLE,
            );
        }
    }

    //-----------------------------------------------------------------

    this.live2DModel.loadParam();

    var update = this.mainMotionManager.updateParam(this.live2DModel);
    if (!update) {
        if (this.eyeBlink) {
            this.eyeBlink.updateParam(this.live2DModel);
        }
    }

    this.live2DModel.saveParam();

    //-----------------------------------------------------------------

    if (this.expressionManager && this.expressions && !this.expressionManager.isFinished()) {
        this.expressionManager.updateParam(this.live2DModel);
    }

    this.live2DModel.addToParamFloat('PARAM_ANGLE_X', this.dragX * 30, 1);
    this.live2DModel.addToParamFloat('PARAM_ANGLE_Y', this.dragY * 30, 1);
    this.live2DModel.addToParamFloat('PARAM_ANGLE_Z', this.dragX * this.dragY * -30, 1);

    this.live2DModel.addToParamFloat('PARAM_BODY_ANGLE_X', this.dragX * 10, 1);

    this.live2DModel.addToParamFloat('PARAM_EYE_BALL_X', this.dragX, 1);
    this.live2DModel.addToParamFloat('PARAM_EYE_BALL_Y', this.dragY, 1);

    this.live2DModel.addToParamFloat('PARAM_ANGLE_X', Number(15 * Math.sin(t / 6.5345)), 0.5);
    this.live2DModel.addToParamFloat('PARAM_ANGLE_Y', Number(8 * Math.sin(t / 3.5345)), 0.5);
    this.live2DModel.addToParamFloat('PARAM_ANGLE_Z', Number(10 * Math.sin(t / 5.5345)), 0.5);
    this.live2DModel.addToParamFloat('PARAM_BODY_ANGLE_X', Number(4 * Math.sin(t / 15.5345)), 0.5);
    this.live2DModel.setParamFloat('PARAM_BREATH', Number(0.5 + 0.5 * Math.sin(t / 3.2345)), 1);

    if (this.physics) {
        this.physics.updateParam(this.live2DModel);
    }

    if (this.lipSync == null) {
        this.live2DModel.setParamFloat('PARAM_MOUTH_OPEN_Y', this.lipSyncValue);
    }

    if (this.pose) {
        this.pose.updateParam(this.live2DModel);
    }

    this.live2DModel.update();
};

var lastExpNo;
LAppModel.prototype.setRandomExpression = function() {
    var tmp = [];
    for (var name in this.expressions) {
        tmp.push(name);
    }

    if (tmp.length === 0) return;

    var no = 0;
    if (tmp.length !== 1) {
        do {
            no = parseInt(Math.random() * tmp.length);
        } while (no === lastExpNo);
        lastExpNo = no;
    }

    this.setExpression(tmp[no]);
};

LAppModel.prototype.startRandomMotion = function(name, priority) {
    var max = this.modelSetting.getMotions(name).length;
    var no = parseInt(Math.random() * max);
    this.startMotion(name, no, priority);
};

LAppModel.prototype.startMotion = function(name, no, priority) {
    var motionName = this.modelSetting.getMotionFile(name, no);

    if (motionName == null || motionName === '') {
        if (LAppDefine.DEBUG_LOG) console.error('Failed to motion.');
        return;
    }

    if (priority === LAppDefine.PRIORITY_FORCE) {
        this.mainMotionManager.setReservePriority(priority);
    } else if (!this.mainMotionManager.reserveMotion(priority)) {
        if (LAppDefine.DEBUG_LOG) console.log('Motion is running.');
        return;
    }

    var thisRef = this;
    var motion;

    if (this.motions[name] == null) {
        this.loadMotion(null, parsePath(this.modelHomeDir, motionName), function(mtn) {
            motion = mtn;

            thisRef.setFadeInFadeOut(name, no, priority, motion);
        });
    } else {
        motion = this.motions[name];

        thisRef.setFadeInFadeOut(name, no, priority, motion);
    }
};

LAppModel.prototype.setFadeInFadeOut = function(name, no, priority, motion) {
    if (priority !== LAppDefine.PRIORITY_IDLE) {
        if (this.curExpName && this.expressions['normal'])
            this.expressionManager.startMotion(this.expressions['normal'], false);
    } else if (this.curExpName) {
        this.expressionManager.startMotion(this.expressions[this.curExpName], false);
    }

    var motionName = this.modelSetting.getMotionFile(name, no);

    motion.setFadeIn(this.modelSetting.getMotionFadeIn(name, no));
    motion.setFadeOut(this.modelSetting.getMotionFadeOut(name, no));

    if (LAppDefine.DEBUG_LOG) console.log('Start motion : ' + motionName);

    if (this.modelSetting.getMotionSound(name, no) == null) {
        this.mainMotionManager.startMotionPrio(motion, priority);
    } else {
        var soundName = this.modelSetting.getMotionSound(name, no);
        // var player = new Sound(this.modelHomeDir + soundName);

        var snd = document.createElement('audio');
        snd.src = parsePath(this.modelHomeDir, soundName);

        var subtitle, font;
        if (MyTools.subtitleEnabled)
            [subtitle, font] = MyTools.getSubtitle(this.subtitles, this.modelSetting.getMotionSubtitle(name, no));

        MyTools.updateAudio(snd, subtitle, font);

        if (LAppDefine.DEBUG_LOG) console.log('Start sound : ' + soundName);

        snd.play();
        this.mainMotionManager.startMotionPrio(motion, priority);
    }
};

LAppModel.prototype.setExpression = function(name) {
    this.curExpName = name;
    var motion = this.expressions[name];

    if (LAppDefine.DEBUG_LOG) console.log('Expression : ' + name);

    this.expressionManager.startMotion(motion, false);
};

LAppModel.prototype.draw = function(gl) {
    //console.log("--> LAppModel.draw()");

    // if(this.live2DModel == null) return;

    MatrixStack.push();

    MatrixStack.multMatrix(this.modelMatrix.getArray());

    this.tmpMatrix = MatrixStack.getMatrix();
    this.live2DModel.setMatrix(this.tmpMatrix);
    this.live2DModel.draw();

    MatrixStack.pop();
};

LAppModel.prototype.hitTest = function(id, testX, testY) {
    var len = this.modelSetting.getHitAreaNum();
    for (var i = 0; i < len; i++) {
        if (id == this.modelSetting.getHitAreaName(i)) {
            var drawID = this.modelSetting.getHitAreaID(i);

            return this.hitTestSimple(drawID, testX, testY);
        }
    }

    return false;
};
