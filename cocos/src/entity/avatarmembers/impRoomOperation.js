"use strict";
/*-----------------------------------------------------------------------------------------
												interface
-----------------------------------------------------------------------------------------*/
var impRoomOperation = impGameRules.extend({
	__init__ : function()
	{
		this._super();
		this.curGameRoom = undefined;
	    KBEngine.DEBUG_MSG("Create impRoomOperation");
  	},

	createRoom : function(player_num, win_num, round_num, king_num, pay_mode, game_mode, is_agent) {
		cc.log("createRoom:",player_num, win_num, round_num, king_num, pay_mode, game_mode, is_agent)
		this.baseCall("createRoom", player_num, win_num, round_num, king_num, pay_mode, game_mode, is_agent);
	},

	createRoomSucceed : function(roomInfo){
		cc.log("createRoomSucceed!")
		this.curGameRoom = new GameRoomEntity(roomInfo['player_num']);
		this.curGameRoom.updateRoomData(roomInfo);
		this.serverSitNum = 0;
		if(roomInfo["isAgent"]){
			this.serverSitNum = -1;
		}
		// else {
		// 	this.curGameRoom.updatePlayerState(this.serverSitNum, 1);
		// }
		if (onhookMgr) {
			onhookMgr.setRoomLeftTime(roomInfo["roomTimeLeft"]);
			this.curGameRoom.createRoomTime = const_val.CREATE_ROOM_WAIT_TIMER + 1; // 本地操作先于服务端，所以增加1s防止网络延迟
			onhookMgr.setCreateRoomLeftTime(const_val.CREATE_ROOM_WAIT_TIMER + 1); // 本地操作先于服务端，所以增加1s防止网络延迟
		}
		h1global.runScene(new GameRoomScene());
		// h1global.curUIMgr.gameroomprepare_ui.show();
		// h1global.curUIMgr.gameroomprepare_ui.update_player_info_panel(0, {});
	},

	createRoomFailed : function(err){
		cc.log("createRoomFailed!");
		if(err == -1){
			h1global.globalUIMgr.info_ui.show_by_info("钻石不足!", cc.size(300, 200));
		} else if(err == -2){
			h1global.globalUIMgr.info_ui.show_by_info("已经在房间中!", cc.size(300, 200));
		}
	},

	server2CurSitNum : function(serverSitNum){
		if(this.curGameRoom){
			if (this.curGameRoom.player_num == 3 && (serverSitNum + this.curGameRoom.playerInfoList.length - this.serverSitNum) % this.curGameRoom.playerInfoList.length == 2) {
				return 3
			}
			return (serverSitNum + this.curGameRoom.playerInfoList.length - this.serverSitNum) % this.curGameRoom.playerInfoList.length;
		} else {
			return -1;
		}
	},

	enterRoom : function(roomId){
		this.baseCall("enterRoom", roomId);
	},

	enterRoomSucceed : function(serverSitNum, roomInfo){
		cc.log("enterRoomSucceed!",roomInfo)
		if (onhookMgr) {
			onhookMgr.setRoomLeftTime(roomInfo["roomTimeLeft"]);
		}
		if (onhookMgr) {
			onhookMgr.setCreateRoomLeftTime(roomInfo["create_room_time"]);
		}
		this.curGameRoom = new GameRoomEntity(roomInfo['player_num']);
		this.curGameRoom.updateRoomData(roomInfo);

		this.serverSitNum = serverSitNum;
		this.curGameRoom.playerStateList = roomInfo["player_state_list"];
		if(cc.director.getRunningScene().className == "GameRoomScene"){
			h1global.runScene(new GameRoomScene());
			cutil.unlock_ui();
		} else {
			h1global.runScene(new GameRoomScene());
		}
	},

	enterRoomFailed : function(err){
		cc.log("enterRoomFailed!");
		if(err == -1){
			h1global.globalUIMgr.info_ui.show_by_info("房间不存在！", cc.size(300, 200));
		} else if(err == -2){
			h1global.globalUIMgr.info_ui.show_by_info("房间人数已满！", cc.size(300, 200));
		} else if(err == -3){
			h1global.globalUIMgr.info_ui.show_by_info("该房间为AA制付费房间，您的钻石不足！", cc.size(300, 200));
		}
	},

	quitRoom : function(){
		if(!this.curGameRoom){
			return;
		}
		this.baseCall("quitRoom");
	},

	quitRoomSucceed : function(){
		this.curGameRoom = null;
		if (onhookMgr) { 
            onhookMgr.setApplyCloseLeftTime(null);
        }
		h1global.runScene(new GameHallScene());
	},

	quitRoomFailed : function(err){
		cc.log("quitRoomFailed!");
	},

	othersQuitRoom : function(serverSitNum){
		if(this.curGameRoom){
			this.curGameRoom.playerInfoList[serverSitNum] = null;
			if(h1global.curUIMgr.gameroomprepare_ui && h1global.curUIMgr.gameroomprepare_ui.is_show){
				h1global.curUIMgr.gameroomprepare_ui.update_player_info_panel(serverSitNum, this.curGameRoom.playerInfoList[serverSitNum]);
			}
		}
	},

	othersEnterRoom : function(playerInfo){
		cc.log("othersEnterRoom")
		cc.log(playerInfo)
		this.curGameRoom.updatePlayerInfo(playerInfo["idx"], playerInfo);
		this.curGameRoom.updatePlayerState(playerInfo["idx"], 0);
		if(h1global.curUIMgr.gameroomprepare_ui && h1global.curUIMgr.gameroomprepare_ui.is_show){
			h1global.curUIMgr.gameroomprepare_ui.update_player_info_panel(playerInfo["idx"], playerInfo);
			h1global.curUIMgr.gameroomprepare_ui.update_player_state(playerInfo["idx"], 0);
		}
	},

	handleReconnect : function(recRoomInfo){
		this.curGameRoom = new GameRoomEntity(recRoomInfo['init_info']['player_num']);
		this.curGameRoom.reconnectRoomData(recRoomInfo);
		if (onhookMgr) {
			onhookMgr.setRoomLeftTime(recRoomInfo["roomTimeLeft"])
		}
		if(this.curGameRoom.isAgent && this.curGameRoom.agentInfo['userId'].compare(this.userId) == 0){
			this.serverSitNum = -1;
		} else {
			var player_base_info_list = recRoomInfo["init_info"]["player_base_info_list"]
			for(var i = 0; i < player_base_info_list.length; i++){
				if(player_base_info_list[i]["userId"].compare(this.userId) == 0){
					this.serverSitNum = i;
					break;
				}
			}
		}
		this.curGameRoom.handTilesList[this.serverSitNum] = this.curGameRoom.handTilesList[this.serverSitNum].sort(cutil.tileSortFunc)		
		h1global.runScene(new GameRoomScene());
	},

	notifyFinalTile : function(){
		if(h1global.curUIMgr.gameroom_ui && h1global.curUIMgr.gameroom_ui.is_show){
			h1global.curUIMgr.gameroom_ui.show_final_operation_panel()
		}
	},

	decideFinalTile : function(isShow){
		var decide = isShow ? 1 : 0;
		this.baseCall("decideFinalTile", decide)
	},

	showFinalTile : function(tile, idx){
		if(h1global.curUIMgr.gameroom_ui && h1global.curUIMgr.gameroom_ui.is_show){
			this.curGameRoom.lastDiscardTile = tile;
			this.curGameRoom.lastDiscardTileFrom = idx;
			h1global.curUIMgr.gameroom_ui.show_final_tiles_panel([tile])
		}
	},

	applyDismissRoom : function(){
		if(this.curGameRoom){
			this.baseCall("applyDismissRoom");
			this.curGameRoom.applyCloseLeftTime = const_val.DISMISS_ROOM_WAIT_TIME + 1; // 本地操作先于服务端，所以增加1s防止网络延迟
			this.curGameRoom.applyCloseFrom = this.serverSitNum;
			this.curGameRoom.applyCloseStateList[this.serverSitNum] = 1;
			h1global.curUIMgr.applyclose_ui.show_by_sitnum(this.serverSitNum);
			onhookMgr.setApplyCloseLeftTime(const_val.DISMISS_ROOM_WAIT_TIME + 1); // 本地操作先于服务端，所以增加1s防止网络延迟
		}
	},

	reqDismissRoom : function(serverSitNum){
		if(this.curGameRoom){
			this.curGameRoom.applyCloseLeftTime = const_val.DISMISS_ROOM_WAIT_TIME;
			this.curGameRoom.applyCloseFrom = serverSitNum
			this.curGameRoom.applyCloseStateList = [0, 0, 0, 0];
			this.curGameRoom.applyCloseStateList[serverSitNum] = 1;
			h1global.curUIMgr.applyclose_ui.show_by_sitnum(serverSitNum);
			onhookMgr.setApplyCloseLeftTime(const_val.DISMISS_ROOM_WAIT_TIME);
		}
	},

	voteDismissRoom : function(vote){
		// cc.log("voteDismissRoom")
		this.baseCall("voteDismissRoom", vote);
	},

	voteDismissResult : function(serverSitNum, vote){
		// cc.log("voteDismissResult")
		if(this.curGameRoom){
			this.curGameRoom.applyCloseStateList[serverSitNum] = vote;
			var vote_agree_num = 0;
			var vote_disagree_num = 0;
			for(var i = 0; i < this.curGameRoom.playerInfoList.length; i++){
				if(this.curGameRoom.applyCloseStateList[i] == 1){
					vote_agree_num = vote_agree_num + 1;
				} else if(this.curGameRoom.applyCloseStateList[i] == 2){
					vote_disagree_num = vote_disagree_num + 1;
				}
			}
			// if(vote_agree_num >= 3){

			// }
            if (vote_disagree_num >= 2 || vote_disagree_num >= this.curGameRoom.playerInfoList.length / 2) {
                if (h1global.curUIMgr.applyclose_ui && h1global.curUIMgr.applyclose_ui.is_show) {
                    h1global.curUIMgr.applyclose_ui.hide();
                    for (var i = 0; i < this.curGameRoom.playerInfoList.length; i++) {
                        this.curGameRoom.applyCloseStateList[i] = 0;
                    }
                }
                return;
            } else if (vote_agree_num == this.curGameRoom.playerInfoList.length - 1) {
                this.quitRoom();
            }
			if(h1global.curUIMgr.applyclose_ui && h1global.curUIMgr.applyclose_ui.is_show){
				h1global.curUIMgr.applyclose_ui.update_vote_state();
			}
		}
	},
});
