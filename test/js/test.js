try {

	var $disksize_txt = $('#disksize_txt'), $body = $('body');

	function set_disksize(data) {
		$disksize_txt.html(data);
	}

	var $info_bar = $('#info_bar'), $handbook_info = $('#handbook_info');
	var BookModel = new Model('handbook', {
		id                  : 'number',
		name                : {
			type      : 'string',
			error     : Errors.invalid_name,
			require   : true,
			maxlength : 50,
			regexp    : /\S+/
		},
		keycode             : {
			regexp  : Consts.keycodeRe,
			error   : Errors.invalid_keycode,
			require : true
		},
		category            : {
			type      : 'string',
			error     : Errors.invalid_category,
			maxlength : 50
		},
		cover               : 'string',
		icon                : 'string',
		shareto             : 'string',
		same_keycode        : {
			type         : 'number',
			defaultValue : 0
		},
		downloadable        : {
			type         : 'number',
			defaultValue : 1
		},
		shareable           : {
			type         : 'number',
			defaultValue : 0
		},
		questionnaire_tag   : {
			type         : 'number',
			defaultValue : 1
		},
		sections_breakable  : {
			type         : 'number',
			defaultValue : 0
		},
		external_accessable : {
			type         : 'number',
			defaultValue : 0
		},
		description         : 'string',
		copyright           : {
			type      : 'string',
			maxlength : 1000
		},
		copyright_layout    : {
			type         : 'number',
			defaultValue : 1
		},
		sections_layout     : {
			type         : 'number',
			defaultValue : 1
		},
		xor_value           : 'string',
		started             : 'string',
		erased              : 'string',
		username            : 'string'
	}, {
		filter  : {
			language  : true,
			editor_id : true,
			num       : true
		},
		hasMany : {
			'Chapter' : {// the plural key is strange in CakePHP
				model         : 'chapter',
				foreignKey    : 'handbook_id',
				cascadeDelete : true
			}
		}
	}).init();
	var ChapterModel = new Model('chapter', {
		id          : 'number',
		name        : BookModel.fields.name,
		keycode     : BookModel.fields.keycode,
		handbook_id : {
			type    : 'number',
			model   : 'handbook',
			many    : true,
			require : true
		},
		quiz_email  : {
			type         : 'number',
			defaultValue : 0
		},
		exam_email  : {
			type         : 'number',
			defaultValue : 0
		}
	}, {
		filter  : {
			description : 'string',
			created     : true,
			updated     : true,
			num         : true
		},
		hasMany : {
			'Section' : {
				model         : 'section',
				foreignKey    : 'chapter_id',
				cascadeDelete : true
			}
		}
	});
	var SectionModel = new Model('section', {
		id               : 'number',
		name             : {
			type      : 'string',
			error     : Errors.invalid_name,
			require   : true,
			maxlength : 50
		},
		attachment_path  : 'string',
		attachment_name  : {
			type      : 'string',
			maxlength : 100
		},
		attachment_type  : 'string',
		description      : 'string',
		description_ipad : 'string',
		chapter_id       : {
			type    : 'number',
			model   : 'chapter',
			many    : true,
			require : true
		},
		xor_value        : 'string',
		quiz_count       : 'number',
		exam_count       : 'number',
		ques_count       : 'number'
	}, {
		beforeFind : function () {
			this.completes = {};
		},
		filter     : {
			created            : true,
			updated            : true,
			num                : true,
			attachment_updated : true
		}
	});
	var Dealkeybind = function () {
		var self = $body.hasClass('index_layout') ? BookListView : ($body.hasClass('chapters_layout') ? ChapterTreeView : '');
		if (self) {
			document.onkeyup = function (e) {
				if ($('.ui-widget-overlay').length) {
					return;
				}
				e = window.event || e;
				if (e.keyCode === 46) {
					if (self.del_btn.is(':visible')) {
						self.del_btn.click();
					}
				}
			};
		} else {
			document.onkeyup = '';
		}
	}
	var BookView = new View('handbook', {
		container     : '#book',
		add_btn       : '#book_add_btn',
		sets          : {
			downloadable       : function (field, data) {
				field.attr('checked', data == 3 || data == 1);
				this.$download_readable_only.attr('checked', data == 2 || data == 3);
			},
			shareable          : function (field, data) {
				field.attr('checked', data == 1);
			},
			cover              : function (field, data, fulldata) {
				field.attr('src', data == '0' || !data ? this.defaultCover : (data.indexOf('.') > 0 ? this.getThumbUrl + fulldata.id + '/' : this.thumbUrl) + data);
				// .css('visibility', 'hidden');
			},
			icon               : function (field, data, fulldata) {
				field.attr('src', data == '0' || !data ? this.defaultCover : (data.indexOf('.') > 0 ? this.getThumbUrl + fulldata.id + '/' : this.thumbUrl) + data + '/30x41');
			},
			copyright_layout   : function (field, data) {
				field.removeClass('selected').eq(data - 1).addClass('selected');
			},
			sections_layout    : function (field, data) {
				field.removeClass('selected').eq(data - 1).addClass('selected');
			},
			sections_breakable : function (field, data) {
				field.attr('checked', data == '1');
			},
			shareto            : function (field, data, fulldata) {
				// if (editorId != fulldata.editor_id) {
				// this.shareto_area.hide();
				// return;
				// }
				// this.shareto_area.show();
				for (var options = this.shareto_options, i = 0, l = options.length, d = data.split(','), opt, s = []; i < l; ++i) {
					opt = options.eq(i);
					if ($.inArray(opt.val(), d) != -1) {
						opt.attr('checked', true);
						s.push(opt[0].nextSibling.childNodes[0].data);
					} else {
						opt.attr('checked', false);
					}
				}
				field.val(data);
				this.shareto_btn.html(s.join(','));
			}
		},
		gets          : {
			downloadable     : function (field) {
				return (this.$download_readable_only.attr('checked') ? 2 : 0) + (field.attr('checked') ? 1 : 0);
			},
			cover            : function (field) {
				var src = field.attr('src');
				if (src !== this.defaultCover) {
					src = src.split('/');
					return src[src.length - 1];
				}
				return 0;
			},
			icon             : function (field) {
				var src = field.attr('src'), icon;
				if (src !== this.defaultCover) {
					src = src.split('/');
					icon = src[src.length - 1];
					return icon === '30x41' ? src[src.length - 2] : icon;
				}
				return 0;
			},
			copyright_layout : function (field) {
				return field.eq(0).hasClass('selected') ? 1 : field.eq(1).hasClass('selected') ? 2 : 3;
			},
			sections_layout  : function (field) {
				return field.eq(0).hasClass('selected') ? 1 : field.eq(1).hasClass('selected') ? 2 : 3;
			}
		},
		init          : function () {
			View.prototype.init.call(this);
			this.getThumbUrl = Consts.getThumbUrl;
			this.thumbUrl = Consts.thumbUrl;
			this.btn_media_switch = $('#btn_media_switch');
			this.$keyword = $('#keyword');
			this.$users_list = $('#users_list');
			this.$download_readable_only = $('#handbook_download_readable_only');
			this.$shareto_btn_search = $('#shareto_btn_search');
			this.$btn_selectall_user = $('#btn_selectall_user');
			this.$btn_selectinverse_user = $('#btn_selectinverse_user');
			this.fields.downloadable.click(function () {
				var checked = BookView.fields.downloadable.attr('checked');
				if (checked) {
					BookView.$download_readable_only.attr('disabled', false);
				} else {
					BookView.$download_readable_only.attr({'disabled' : true, checked : false});
				}
			});
			this.dialog = this.container.dialog({
				autoOpen    : false,
				draggable   : false,
				resizable   : false,
				stack       : false,
				dialogClass : 'book_dialog',
				width       : 960,
				position    : ['center', 60],
				zIndex2     : 1005,
				modal       : true
			});

			var self = this, cover_frame = $('#handbook_cover_frame'), cover = this.fields.cover, icon_frame = $('#handbook_icon_frame'), icon = this.fields.icon, defaultCover = this.defaultCover = Consts.defaultCover, btn_tab_img = $('#btn_tab_img'), copyright_layouts, sections_layouts, shareto_list, shareto, shareto_btn, i, s, editor;
			cover_frame.add(icon_frame).click(function () {
				if (this.id === 'handbook_cover_frame') {
					cover_frame.addClass('selected');
					icon_frame.removeClass('selected');
					Medialib.insertMedia = self.insertToCover;
				} else {
					cover_frame.removeClass('selected');
					icon_frame.addClass('selected');
					Medialib.insertMedia = self.insertToIcon;
				}
				if (!curMedia) {
					btn_tab_img.click();
				}
			}).droppable({
					tolerance  : 'pointer',
					accept     : function () {
						return curMedia === 'image';
					},
					addClasses : false,
					drop       : function (evt, ui) {
						var isCover = this.id === 'handbook_cover_frame';
						( isCover ? cover : icon).attr({
							src : ui.draggable.attr('src')
							// + (isCover ? '' : '/30x41')
						});
					}
				});
			$('#clear_cover_btn').click(function (e) {
				cover.attr('src', defaultCover);
			});
			$('#clear_icon_btn').click(function (e) {
				icon.attr('src', defaultCover);
			});
			cover.load(this.resizeImg);
			icon.load(this.resizeIcon);

			for (i = 0, s = []; ( editor = groupEditors[i]); ++i) {
				s[i] = '<li data-username="' + editor.username + '" title="' + editor.username + '"><input type="checkbox" value="' + editor.id + '"><span>' + editor.username + '</span></li>';
			}
			this.shareto_area = $('#handbook_shareto_area');
			shareto = this.fields.shareto;
			shareto_btn = this.shareto_btn = $('#handbook_shareto_btn');
			shareto_btn.add(shareto_btn.next()).click(function () {
				shareto_list.toggle('slideUp');
				BookView.$keyword.val('');
				BookView.$users_list_li.show();
			});
			shareto_list = this.shareto_list = $('#handbook_shareto_list');
			this.$users_list.html(s.join(''));
			this.shareto_list.click(function () {
				var vs = [], ids = [];
				shareto_list.find(':checked').each(function (i, input) {
					ids.push(input.value);
					vs.push(input.nextSibling.childNodes[0].data);
				});
				shareto_btn.html(vs.join(','));
				shareto.val(ids.join(','));
			});
			this.$users_list_li = $('#users_list li');

			var st, searchUser = function () {
				window.clearTimeout(st);
				st = window.setTimeout(function () {
					var keyword = BookView.$keyword.val();
					if (keyword !== '') {
						BookView.$users_list_li.hide();
						BookView.$users_list_li.filter('[data-username*=' + keyword + ']').show();
					} else {
						BookView.$users_list_li.show();
					}
				}, 100);
			};
			this.$shareto_btn_search.click(searchUser);
			this.$keyword.keyup(searchUser);
			this.$btn_selectall_user.click(function () {
				BookView.$users_list.find('input:visible').attr('checked', true);
			});
			this.$btn_selectinverse_user.click(function () {
				BookView.$users_list.find('input:visible').not($('#users_list input:checked').attr('checked', false)).attr('checked', 'checked');
			});

			this.shareto_options = this.$users_list.find('input');
			copyright_layouts = this.copyright_layouts = this.fields['copyright_layout'];
			copyright_layouts.click(function (e) {
				copyright_layouts.removeClass('selected');
				this.className += ' selected';
			});
			sections_layouts = this.sections_layouts = this.fields['sections_layout'];
			sections_layouts.click(function (e) {
				sections_layouts.removeClass('selected');
				this.className += ' selected';
			});

			this.fields.erased.add(this.fields.started).datetimepicker({
				dateFormat         : 'yy-mm-dd',
				timeFormat         : 'hh:mm',
				showOn             : 'both',
				showMonthAfterYear : LANG !== 'eng',
				buttonImage        : Consts.datepickerIcon,
				yearSuffix         : __('year'),
				dayNames           : [__('Sunday'), __('Monday'), __('Tuesday'), __('Wednesday'), __('Thursday'), __('Friday'), __('Saturday')],
				dayNamesMin        : [__('Su'), __('Mo'), __('Tu'), __('We'), __('Th'), __('Fr'), __('Sa')],
				monthNames         : [__('January'), __('February'), __('March'), __('April'), __('May'), __('June'), __('July'), __('August'), __('September'), __('October'), __('November'), __('December')],
				nextText           : __('Next'),
				prevText           : __('Prev'),
				currentText        : __('Now'),
				closeText          : __('Done'),
				timeText           : __('Time'),
				hourText           : __('Hour'),
				minuteText         : __('Minute'),
				resetText          : __('reset'),
				buttonImageOnly    : true
			});

			return this;
		},
		resizeImg     : function () {
			var s = this.style, w;
			s.height = '100%';
			s.width = 'auto';
			// s.left = '0px';
			// s.top = '0px';
			w = this.offsetWidth;
			if (!w) {
				return;
			}
			if (w < 80) {
				s.width = '80px';
				s.height = 'auto';
				s.top = (50 - this.offsetHeight / 2) + 'px';
				s.left = '0px';
			} else {
				s.top = '0px';
				s.left = (40 - w / 2) + 'px';
			}
			// $(this).hide().fadeIn();
			// $(this).css('visibility', 'visible').hide().fadeIn();
		},
		resizeIcon    : function () {
			var s = this.style, w;
			s.height = '100%';
			s.width = 'auto';
			w = this.offsetWidth;
			if (!w) {
				return;
			}
			if (w < 32) {
				s.width = '32px';
				s.height = 'auto';
				s.top = (20 - this.offsetHeight / 2) + 'px';
				s.left = '0px';
			} else {
				s.top = '0px';
				s.left = (16 - w / 2) + 'px';
			}
			// $(this).fadeIn();
			// $(this).css('visibility', 'visible').hide().fadeIn();
		},
		insertToCover : function (id, type) {
			if (type === 'image') {
				BookView.fields.cover.attr({
					src : Consts.thumbUrl + id
				});
			}
		},
		insertToIcon  : function (id, type) {
			if (type === 'image') {
				BookView.fields.icon.attr({
					src : Consts.thumbUrl + id
				});
			}
		},
		show          : function () {
			this.container.dialog('open');
			this.shareto_list.hide();
			Medialib.stopPreview = true;
			Medialib.$medialib.css('zIndex', 2000);
			$('.ui-widget-overlay').css('zIndex', 1001);
			// $('.book_dialog').css('zIndex', 1005);
			// $('.media_dialog').css('zIndex', 1002);
			Medialib.insertMedia = null;

			FolderView.add_btn.hide();
			LstFolderView.edit_btn.hide();
			LstFolderView.del_btn.hide();
			LstMediaView.edit_btn.hide();
			LstMediaView.del_btn.hide();
			return this;
		},
		hide          : function () {
			Medialib.stopPreview = false;
			Medialib.$medialib.css('zIndex', 1000);
			this.container.dialog('close');
			if (curMedia) {
				this.btn_media_switch.click();
			}

			FolderView.add_btn.css('display', '');
			LstFolderView.edit_btn.css('display', '');
			LstFolderView.del_btn.css('display', '');
			LstMediaView.edit_btn.css('display', '');
			LstMediaView.del_btn.css('display', '');
			return this;
		},
		beforeSave    : function (data) {
			if (data.id) {
				return;
			}
			data['username'] = AUTHOR;
		},
		onSave        : function (data, fulldata, res) {
			set_disksize(res.disksize);
		}
	}).init();

	function book_same_init() {
		var self = this;
		this.checkResponse = checkResponse;
		this.errorCallback = errorCallback;
		this.cloneHandler = function () {
			if (this.clone_btn.hasClass('disable') || !this.select_id) {
				return;
			}
			var sid = this.select_id, idx = this.getIndex(sid), olddata = this.data[idx], data = {}, cloneItem, img, cover, p;
			for (p in olddata) {
				if (p === 'name' && olddata[p].slice(0, 8) !== 'Copy of ') {
					data[p] = 'Copy of ' + olddata[p];
					if (data[p].length > 50) {
						data[p] = data[p].slice(0, 50);
					}
				} else {
					data[p] = olddata[p];
				}
			}
			// delete data.id;
			cloneItem = this.insertItem(data, ++idx).addClass('disable');
			if (!preference.handbook_list_layout) {
				img = cloneItem.find('img');
				this.resizeImg.call(img[0]);
				img.load(this.resizeImg);
			} else {
				img = cloneItem.find('img');
				img.attr('src', img.attr('data-url'));
			}
			$.ajax({
				url      : 'handbooks/clone/',
				type     : 'POST',
				data     : {
					'data[Handbook][id]' : sid
				},
				dataType : 'json',
				timeout  : this.timeout,
				context  : this,
				error    : this.errorCallback,
				success  : function (res, status, xhr) {
					if (this.checkResponse(res)) {
						data.id = res.id;
						data.xor_value = res.data.xor_value;
						set_disksize(res.disksize);
						$.console(Msgs.completed_clone_the_handbook + data.name);
						if (this.model.localAdapter.save.call(this.model, data, this.pseudoFn)) {
							this.model.completes[res.id] = false;
							cloneItem.attr('data-id', res.id).removeClass('disable selected');
						}
						;
					} else {
						this.items = this.items.not(cloneItem);
						cloneItem.remove();
						this.data.splice(idx, 1);
					}
				}
			});
		};
		this.clone_btn = $('#book_dup_btn').click(this.cloneHandler.bind(this));
		this.export_btn = $('#book_export_btn').click(function () {
			if (self.select_id) {
				window.open('handbooks/backup/' + self.select_id)
			}
		});
		this.btns = this.del_btn.add(this.edit_btn).add(this.clone_btn).add(this.export_btn);
		this.$main = $('#main');
		this.scrollToEnd = function () {
			var _scrollHeight = this.$main[0].scrollHeight;
			if (this.$main.scrollTop() !== _scrollHeight) {
				this.$main.scrollTop(_scrollHeight);
			}
		};
		var uploadingFiles = {};
		$('#book_upload').fileUploadUI({
			dragDropSupport : false,
			uploadTable     : $('#import_table'),
			// downloadTable : $('#import_table'),
			buildUploadRow  : function (files, index) {
				return $('<tbody><tr><td colspan="2"><div class="file_upload_name">' + files[index].name + '<\/div><\/td></tr><tr>' + '<td class="file_upload_progress"><div><\/div><\/td><td class="file_upload_cancel">' + '<button class="ui-state-default ui-corner-all">' + '<span class="ui-icon ui-icon-cancel"><\/span><\/button><\/td><\/tr></tbody>');
			},
			beforeSend      : function (event, files, index, xhr, handler, callBack) {
				uploadingFiles[index] = true;
				var arr = (files[index].fileName || files[index].name).split('.');
				if (arr.length > 1 && arr[arr.length - 1].toLowerCase() !== 'zip' && arr[arr.length - 1].toLowerCase() !== 'hbz') {
					delete uploadingFiles[index];
					$.console(Errors.invalid_data, 3);
					handler.removeNode(handler.uploadRow);
					return false;
				}
				// handler.url = 'attachments/save';
				BookListView.import_dialog.dialog('open');
				callBack();
			},
			onComplete      : function (event, files, index, xhr, handler) {
				delete uploadingFiles[index];
				if ($.isEmptyObject(uploadingFiles)) {
					BookListView.import_dialog.dialog('close');
				}
				var res = handler.response;
				if (self.checkResponse(res)) {
					self.model.listCache = {};
					set_disksize(res.disksize);
					self.load(self.pageSize ? -1 : '');
					if (!self.pageSize) {
						window.setTimeout(function () {
							self.selectItem($(self.items[self.getIndex(res.data.books[0]['id'])]));
							self.scrollToEnd();
						}, 1000)
					}
				}
			},
			onAbort         : function (event, files, index, xhr, handler) {
				handler.removeNode(handler.uploadRow);
				delete uploadingFiles[index];
				if ($.isEmptyObject(uploadingFiles)) {
					BookListView.import_dialog.dialog('close');
				}
			},
			onError         : function (event, files, index, xhr, handler) {
				handler.removeNode(handler.uploadRow);
				delete uploadingFiles[index];
				if ($.isEmptyObject(uploadingFiles)) {
					BookListView.import_dialog.dialog('close');
				}
			}
		}).find('input').val('');
		this.onSelectItemChange = function (item, select) {
			this.btns[select ? 'removeClass' : 'addClass']('disable');
			Dealkeybind();
		}
		this.resizeImg = BookView.resizeImg;
		this.addHandler = function () {
			BookView.show().change({});
		};
		this.loadImg = function (i, img) {
			var el = $(img);
			if (el.attr('src') != BookListView.defaultCover && img.width) {
				BookListView.resizeImg.call(img);
			}
			el.load(BookListView.resizeImg);
		};
		this.import_dialog = $('#import_dialog').dialog({
			autoOpen2   : false,
			draggable   : false,
			resizable   : false,
			stack       : false,
			width       : 400,
			dialogClass : 'import_dialog',
			modal       : true
		}).dialog('close');
		this.afterRemove = function (id, res) {
			set_disksize(res.disksize);
			$.console(Msgs.completed_remove_the_handbook + res.data.name);
			if (preference.handbook_list_layout && !self.container.find('.book_list_item').length) {
				self.container.append(self.new_book.click(self.addHandler));
			}
		}, this.dblclickHandler = function (e) {
			var target = $(e.target), item = target.hasClass(preference.handbook_list_layout ? '.book_list_item' : '.book') ? target : target.parents(preference.handbook_list_layout ? '.book_list_item:eq(0)' : '.book:eq(0)'), bid;
			if (item.length && !item.hasClass('disable')) {
				ChapterModel.listCache = {};
				bid = item.attr('data-id');
				ChapterTreeView.show().load({
					'handbook_id' : bid,
					is            : 1
				});
				ChapterTreeView.handbook_id = bid;
				Dealkeybind();
			}
		}, this.container.dblclick(this.dblclickHandler);
	}

	var BookListView = preference.handbook_list_layout ? new ListView('handbooks', {
		template   : '<tr class="book_list_item" data-id="{id}"><td class="book_list_imgtd"><img src="img/book/default_list_cover.png" data-url="{cover}"></td><td><div class="text_overflow">{name}</div></td><td><div class="text_overflow">{username}</div></td><td><div class="text_overflow">{keycode}</div></td></tr>',
		container  : '#book_list_area',
		model      : 'handbook',
		view       : 'handbook',
		del_btn    : '#book_del_btn',
		edit_btn   : '#book_edit_btn',
		itemClass  : 'book_list_item',
		gets       : {
			name  : function (data) {
				return data.escapeHTML();
			},
			cover : function (data, fulldata) {
				if (data) {
					return data.indexOf('.') > 0 ? (Consts.getThumbUrl + fulldata.id + '/' + data) : (Consts.thumbUrl + data);
				} else {
					return Consts.defaultListCover;
				}
			}
		},
		init       : function () {
			ListView.prototype.init.call(this);
			book_same_init.call(this);
			var cols = [], oldIdx, newIdx, self = this, $bodyWidth = $('body').width();
			this.new_book = $('<tr id="new_list_book"><td class="book_list_imgtd"><img src="img/book/new_list_book.png"></td><td colspan="3"><div class="text_overflow">' + Msgs.add_a_new_book + '</div></td></tr>');
			$('.list_title_bar colgroup col').each(function (i, n) {
				cols[i] = parseInt(n.width) * 0.01 * $bodyWidth;
			});
			this.container.sortable({
				revert      : true,
				placeholder : 'sortable_placeholder',
				start       : function (event, ui) {
					ui.item.css({
						'background' : '#0172F1',
						'opacity'    : '0.5'
					});
					ui.item.find('td').each(function (i, n) {
						n.width = cols[i];
					});
					oldIdx = self.getIndex(ui.item.attr('data-id'));
				},
				stop        : function (event, ui) {
					ui.item.removeAttr('style');
					var _item = ui.item, _prev = _item.prev(), _next = _item.next();
					window.setTimeout(function () {
						_item.removeAttr('style');
						_item.find('td').each(function (i, n) {
							n.removeAttribute('width');
						});
					}, 500);
					newIdx = _item.prev().length ? (self.getIndex(_prev.attr('data-id')) + 1) : 0;
					if (oldIdx === newIdx) {
						return;
					} else {
						var _dataArr = self.data;
						if (oldIdx < newIdx) {
							self.data = [].concat(_dataArr.slice(0, oldIdx), _dataArr.slice(oldIdx + 1, newIdx), _dataArr[oldIdx], _dataArr.slice(newIdx, _dataArr.length));
						} else {
							self.data = [].concat(_dataArr.slice(0, newIdx), _dataArr[oldIdx], _dataArr.slice(newIdx, oldIdx), _dataArr.slice(oldIdx + 1, _dataArr.Length));
						}
					}
					self.model.listCache = {};
					self.items = self.container.find('.book_list_item');
					$.ajax({
						url      : 'handbooks/move',
						type     : 'POST',
						data     : {
							'data[Handbook][id]' : _item.attr('data-id'),
							'data[handbook_id]'  : (_prev.length ? _prev : _next).attr('data-id'),
							'data[direction]'    : _prev.length ? 'after' : 'before'
						},
						dataType : 'json',
						error    : this.errorCallback,
						success  : this.checkResponse
					});
				}
			});
			return this;
		},
		show       : function () {
			document.body.className = 'index_layout list';
			ChapterTreeView.container.empty();
		},
		onSave     : function (data, fulldata, res) {
			if (res.id) {
				this.selectItem($(this.items[this.getIndex(res.id)]));
				this.scrollToEnd();
			}
		},
		changeItem : function (data, fulldata, item, res) {
			var _html = $(this.getHtml(fulldata)).html();
			var _src = _html.match(/src="(\S*)"/), _dataurl = _html.match(/data-url="(\S*)"/);
			_html = _html.replace(_src && _src[1], _dataurl && _dataurl[1]);
			return item && item.html(_html);
		},
		onChange   : function () {
			if (!this.items.length) {
				this.container.append(this.new_book.click(this.addHandler));
			}
			$('#books').css('overflow-y', 'auto');
			$(".book_list_item img").scrollToLoad({container : "#books", 'offset' : 60, 'event' : 'fadeIn'});
		},
		insertItem : function (data, pos) {
			var item = ListView.prototype.insertItem.call(this, data, pos);
			this.new_book.remove();
			return item;
		}
	}).init().load() : new ListView('handbooks', {
		template      : '<div class="book" data-id="{id}"><div class="dropper"><div></div></div><div><div class="img_frame"><img src="{cover}"></div><div class="book_name" title="{name}">{name}</div>' + (preference.show_keycode == '1' ? '<div class="text_overflow keycode" title="{keycode}">{keycode}</div>' : '') + '</div><div class="dropper"><div></div></div></div>',
		model         : 'handbook',
		view          : 'handbook',
		container     : '#shelf',
		page_bar      : '#book_page_bar',
		del_btn       : '#book_del_btn',
		edit_btn      : '#book_edit_btn',
		pageSize      : 12,
		itemClass     : 'book',
		// unselectable : true,
		gets          : {
			name  : function (data) {
				return data.escapeHTML();
			},
			cover : function (data, fulldata) {
				return data == '0' || !data ? this.defaultCover : data.indexOf('.') > 0 ? this.getThumbUrl + fulldata.id + '/' + data : this.thumbUrl + data;
			}
		},
		init          : function () {
			ListView.prototype.init.call(this);
			book_same_init.call(this);
			var self = this, t, i, s;
			this.getThumbUrl = Consts.getThumbUrl;
			this.thumbUrl = Consts.thumbUrl;
			this.defaultCover = Consts.defaultCover;
			this.new_book = $('<div id="new_book"></div>');
			t = this.drop_page_bar = $('#drop_page_bar');
			(this.drop_prev_btn = t.children('.prev_page_btn')).add(this.drop_next_btn = t.children('.next_page_btn')).droppable({
				addClasses : false,
				tolerance  : 'pointer',
				hoverClass : 'hover',
				over       : this.setDropBar.bind(this)
			});
			for (i = 1, s = ''; i < 11; ++i) {
				s += '<a>' + i + '</a>';
			}
			t = this.drop_pages = t.children('.pages').html(s).children();
			t.droppable({
				addClasses : false,
				tolerance  : 'pointer',
				hoverClass : 'hover',
				drop       : this.moveToHandler.bind(this)
			});

			this.dragCfg = {
				addClasses        : false,
				opacity           : 0.5,
				revert            : true,
				refreshPositions2 : true,
				start             : function (e, ui) {
					self.moveTo = false;
					self.prevItem = ui.helper.prev();
					self.page_bar.addClass('hide');
					self.drop_page_bar.css('height', 60);
					self.setDropBar();
				},
				stop              : function (e, ui) {
					self.page_bar.removeClass('hide');
					self.drop_page_bar.css('height', 0);
				}
			};
			this.dropCfg = {
				addClasses : false,
				greedy     : true,
				tolerance  : 'pointer',
				hoverClass : 'hover',
				drop       : this.moveHandler.bind(this)
			};

			return this;
		},
		cloneHandler  : function () {
			if (this.clone_btn.hasClass('disable') || !this.select_id) {
				return;
			}
			var idx = this.getIndex(this.select_id), olddata = this.data[idx], data = {}, cloneItem, img, cover, p;
			for (p in olddata) {
				if (p === 'name' && olddata[p].slice(0, 8) !== 'Copy of ') {
					data[p] = 'Copy of ' + olddata[p];
					if (data[p].length > 50) {
						data[p] = data[p].slice(0, 50);
					}
				} else {
					data[p] = olddata[p];
				}
			}
			// delete data.id;
			cloneItem = this.insertItem(data, ++idx).addClass('disable');
			if (!preference.handbook_list_layout) {
				img = cloneItem.find('img');
				this.resizeImg.call(img[0]);
				img.load(this.resizeImg);
			}
			$.ajax({
				url      : 'handbooks/clone/',
				type     : 'POST',
				data     : {
					'data[Handbook][id]' : this.select_id
				},
				dataType : 'json',
				timeout  : this.timeout,
				context  : this,
				error    : this.errorCallback,
				success  : function (res, status, xhr) {
					if (this.checkResponse(res)) {
						data.id = res.id;
						data.xor_value = res.data.xor_value;
						set_disksize(res.disksize);
						$.console(Msgs.completed_clone_the_handbook + data.name);
						if (this.model.localAdapter.save.call(this.model, data, this.pseudoFn)) {
							this.model.completes[res.id] = false;
							cloneItem.attr('data-id', res.id).removeClass('disable selected');
						}
						;
					}
				}
			});
		},
		onChange      : function () {
			if (!this.items.length) {
				this.container.append(this.new_book.click(this.addHandler));
			} else {
				this.container.find('img').each(this.loadImg);
				this.draggers = this.items.removeClass('disable').draggable(this.dragCfg);
				this.droppers = this.container.find('.dropper').droppable(this.dropCfg);
			}
		},
		changeItem    : function (data, fulldata, item) {
			if (data.hasOwnProperty('cover')) {
				item.find('img').attr('src', this.gets.cover.call(this, data.cover, data));
			}
			if (data.name) {
				item.find('.book_name').attr('title', data.name).html(data.name.escapeHTML());
			}
			if (data.keycode) {
				item.find('.keycode').html(data.keycode);
			}
			return item;
		},
		insertItem    : function (data, pos) {
			var item = ListView.prototype.insertItem.call(this, data, pos), img = item.find('img');
			if (img[0].width) {
				this.resizeImg.call(img[0]);
			}
			img.load(this.resizeImg);
			this.draggers = this.items.draggable(this.dragCfg);
			this.droppers = this.container.find('.dropper').droppable(this.dropCfg);
			this.new_book.remove();
			return item;
		},
		moveHandler   : function (e, ui) {
			this.page_bar.removeClass('hide');
			this.drop_page_bar.css('height', 0);
			if (this.moveTo) {
				return;
			}
			this.model.listCache = {};
			// don't forget to reset model pageCache
			var item = ui.draggable, t = e.target, prev = $(t).parent(), id, rid, dir, data, idx, ridx, d;
			if (prev.children(':first')[0] === t) {
				t = prev.prev();
				if (t.length) {
					prev = t;
				} else {
					t = false;
				}
			}
			if (!this.prevItem || prev[0] === item[0] || t && prev[0] === this.prevItem[0]) {// position not change
				return;
			}
			id = item.attr('data-id');
			data = this.data;
			if (t) {
				prev.after(item);
				rid = prev.attr('data-id');
				dir = 'after';
				d = data[ idx = this.getIndex(id)];
				ridx = this.getIndex(rid);
				data.splice(idx, 1);
				data.splice(ridx > idx ? ridx : ridx + 1, 0, d);
			} else {
				prev.before(item);
				rid = prev.attr('data-id');
				dir = 'before';
				d = data[ idx = this.getIndex(id)];
				data.splice(idx, 1);
				data.unshift(d);
			}
			item.css({
				top  : 0,
				left : 0
			});
			this.droppers.removeClass('hover');

			// need to reset the items and data properties
			this.items = this.container.find('.book');
			$.ajax({
				url      : 'handbooks/move',
				type     : 'POST',
				data     : {
					'data[Handbook][id]' : id,
					'data[handbook_id]'  : rid,
					'data[direction]'    : dir
				},
				dataType : 'json',
				timeout  : this.timeout,
				error    : this.errorCallback,
				success  : this.checkResponse
			});
		},
		setDropBar    : function (e, ui) {
			var totalPage = this.totalPage, i, l, num;
			if (!e) {
				num = this.dropPage = 1;
			} else if ($(e.target).hasClass('next_page_btn')) {
				num = this.dropPage + 10;
				if (num > totalPage) {
					return;
				}
			} else {
				num = this.dropPage - 10;
				if (num < 1) {
					return;
				}
			}
			for (this.dropPage = num, pages = this.drop_pages, i = 0, l = num + 10 < totalPage ? num + 10 : totalPage + 1; i < 10; ++i, ++num) {
				a = pages.eq(i);
				if (num < l) {
					a.html(num).show();
				} else {
					a.hide();
				}
			}
			this.drop_prev_btn[this.dropPage === 1 ? 'addClass' : 'removeClass']('disable');
			this.drop_next_btn[l === totalPage + 1 ? 'addClass' : 'removeClass']('disable');
		},
		moveToHandler : function (e, ui) {
			this.moveTo = true;
			// prevent send the 'move' request at the
			// same time
			this.model.listCache = {};
			// don't forget to reset model
			// pageCache
			var item = ui.draggable, page = Number(e.target.innerHTML);
			if (page != this.page) {
				$.ajax({
					url      : 'handbooks/moveto',
					type     : 'POST',
					data     : {
						'data[Handbook][id]' : item.attr('data-id'),
						'data[page]'         : page,
						'data[pageSize]'     : this.pageSize
					},
					dataType : 'json',
					timeout  : this.timeout,
					context  : this,
					error    : this.errorCallback,
					success  : function (res, status, xhr) {
						if (this.checkResponse(res)) {
							this.load(page);
						}
					}
				});
			}
		},
		show          : function () {
			document.body.className = 'index_layout graphic';
			ChapterTreeView.container.empty();
		}
	}).init().load();
	var ChapterView = new View('chapter', {
		init         : function () {
			View.prototype.init.call(this);
			this.dialog = this.container.dialog({
				autoOpen    : false,
				draggable   : false,
				resizable   : false,
				stack       : false,
				dialogClass : 'chapter_dialog',
				width       : 650,
				position    : ['center', 180],
				zIndex      : 1015,
				modal       : true
			});
			return this;
		},
		beforeChange : function (data, res) {
			var bid = BookListView.select_id, bdata = BookModel.cache[bid], f = this.fields.keycode;
			if (bdata.same_keycode == '1') {
				data.keycode = bdata.keycode;
				f.attr('disabled', 'disabled');
			} else {
				f.removeAttr('disabled');
				if (!data || !data.id) {// set some fields when new chapter
					data.keycode = bdata.keycode;
				}
			}
			data.handbook_id = bid;
		},
		beforeSave   : function (data) {
			if (data.id) {// edit follow normal way
				return;
			}
			var item = ChapterTreeView.select_item;
			if (item) {
				if (item.hasClass('chapter') || item.hasClass('chapter_list_item')) {
					data['data[chapter_id]'] = item.attr('data-id');
					data['data[section_id]'] = 0;
				} else {
					data['data[chapter_id]'] = item.prevAll(preference.section_list_layout ? '.chapter_list_item:eq(0)' : '.chapter:eq(0)').attr('data-id');
					data['data[section_id]'] = item.attr('data-id');
				}
			} else {
				data['data[chapter_id]'] = ChapterTreeView.container.children(preference.section_list_layout ? '.chapter_list_item:last' : '.chapter:last').attr('data-id');
				data['data[section_id]'] = ChapterTreeView.container.children(preference.section_list_layout ? '.section_list_item:last' : '.section:last').attr('data-id') || 0;
			}
		},
		onSave       : function (data, fulldata, res) {
			if (res.id) {// add
				ChapterTreeView.insertItem(fulldata, ChapterTreeView.select_item);
				ChapterTreeView.selectItem(ChapterTreeView.getItem(res.id, 0));
				if (!preference.section_list_layout) {
					var container = ChapterTreeView.container;
					ChapterTreeView.draggers = container.children().draggable(ChapterTreeView.dragCfg);
					ChapterTreeView.droppers = container.find('.dropper').droppable(ChapterTreeView.dropCfg);
				}
			}
		},
		show         : function () {
			if (!this.initialized) {
				this.init();
			}
			this.container.dialog('open');
			return this;
		},
		hide         : function () {
			this.container.dialog('close');
			return this;
		}
	});
	var SectionView = new View('section', {
		gets               : {
			description      : function () {
				var data = this.editor.getData();
				return data ? data.split_desc() : '';
			},
			description_ipad : function () {
				var data = this.ipad_editor.getData();
				return data ? data.split_desc() : '';
			}
		},
		sets               : {
			description      : function (field, data) {
				data = data.merge_desc();
				this.editor.setData(data);
				// this.editor.document.$.execCommand('inserthtml', false, data);
			},
			description_ipad : function (field, data) {
				data = data.merge_desc();
				this.ipad_editor.setData(data);
			},
			attachment_path  : function (field, data, alldata) {
				if (data && data != '0' && data != '-1') {
					this.section_attachment_ico.attr('src', (data.toString().indexOf('.') > 0 ? this.getThumbUrl + ChapterTreeView.handbook_id + '/' : this.thumbUrl) + data);
					this.section_attachment_name.html(alldata.attachment_name || '');
					this.section_drop_tips.hide();
					this.attachment_upload.hide();
					this.attachment_clear_btn.show();
					this.fields.attachment_name.val(alldata.attachment_name || '');
					this.fields.attachment_path.val(data);
					if (alldata.attachment_type !== 'audio') {
						this.section_mask.show();
						this.iphone_area.droppable('disable');
						this.pad_area.droppable('disable');
					} else {
						this.section_mask.hide();
						this.iphone_area.droppable('enable');
						this.pad_area.droppable('enable');
					}
				} else {
					this.iphone_area.droppable('enable');
					this.pad_area.droppable('enable');
					this.fields.attachment_path.val(0);
					this.section_attachment_ico.attr('src', this.defaultAttachmentIcon);
					this.section_attachment_name.html('');
					this.section_drop_tips.show();
					this.fields.attachment_name.val('');
					this.attachment_upload.show();
					this.attachment_clear_btn.hide();
					this.section_mask.hide();
				}
			}
		},
		init               : function () {
			View.prototype.init.call(this);
			this.getThumbUrl = Consts.getThumbUrl;
			this.thumbUrl = Consts.thumbUrl;
			this.defaultAttachmentIcon = Consts.defaultAttachmentIcon;
			this.defaultDropImg = Consts.defaultDropImg;
			$('#section_form').submit(falseFn);

			var self = this, editorDropCfg = {
				tolerance : 'pointer',
				drop      : function (env, ui) {
					var item = ui.draggable.parents('.media_item');
					self.selected_editor = self.editor;
					self.insertMedia(item.attr('data-id'), curMedia, item.children('label').html(), item.attr('data-type'));
				}
			}, ipadEditorDropCfg = {
				tolerance : 'pointer',
				drop      : function (env, ui) {
					var item = ui.draggable.parents('.media_item');
					self.selected_editor = self.ipad_editor;
					self.insertMedia(item.attr('data-id'), curMedia, item.children('label').html(), item.attr('data-type'));
				}
			};
			this.selected_editor = this.editor = CKEDITOR.replace('section_description');
			this.editor.on('dataReady', function () {
				Medialib.insertMedia = self.insertMedia;
			});
			this.ipad_editor = CKEDITOR.replace('section_description_ipad');
			this.ipad_editor.on('dataReady', function () {
				Medialib.insertMedia = self.insertMedia;
			});
			this.editor.on('instanceReady', function (e) {
				self.iphone_area = $('#cke_section_description').droppable(editorDropCfg);
			});
			this.ipad_editor.on('instanceReady', function (e) {
				self.pad_area = $('#cke_section_description_ipad').droppable(ipadEditorDropCfg);
			});
			this.iphone_area = $('#cke_section_description').droppable(editorDropCfg);
			this.pad_area = $('#cke_section_description_ipad').droppable(ipadEditorDropCfg);
			this.iphone_btn = $('#section_iphone_btn').click(this.hidePadArea.bind(this));
			this.pad_btn = $('#section_ipad_btn').click(this.showPadArea.bind(this));

			this.section_mask = $('#section_mask');
			this.section_attachment_name = $('#section_attachment_name_txt');
			this.section_attachment_ico = $('#section_attachment_ico');
			this.section_drop_tips = $('#section_drop_tips');
			this.attachment_clear_btn = $('#attachment_clear_btn').click(this.dropHandler = this.dropHandler.bind(this));
			this.section_drop_area = $('#section_drop_area').droppable({
				tolerance  : 'pointer',
				hoverClass : 'hover',
				drop       : this.dropHandler
			});
			this.attachment_upload = $('#attachment_upload');
			this.attachment_upload.fileUploadUI({
				dragDropSupport    : isWindowsSafari ? false : true,
				uploadTable        : $('#section_upload_table'),
				buildUploadRow     : function (files, index) {
					return $('<tbody><tr><td colspan="2">' + files[index].name + '<\/td></tr><tr>'
						+ '<td class="file_upload_progress"><div><\/div><\/td><td class="file_upload_cancel">'
						+ '<button class="ui-state-default ui-corner-all">'
						+ '<span class="ui-icon ui-icon-cancel"><\/span><\/button><\/td><\/tr></tbody>');
				},
				beforeSend         : function (event, files, index, xhr, handler, callBack) {
					if (files.length != 1) {
						return;
					}
					if (!self.data.id) {
						$.console(Errors.not_save_section, 2);
						return;
					}
					fn = files[index].fileName || files[index].name;
					ext = fn.split('.').pop().toLowerCase();
					if (ext.length > 1 && $.inArray(ext, Consts.allowedExtensions) < 0) {
						$.console(Errors.invalid_extension.replace('{filename}', fn).replace('{extensions}',
							Consts.allowedExtensions.join(',')), 3);
						this.dropZone.find('input').val('');
						self.attachment_upload.stop()// .hide();
						handler.removeNode(handler.uploadRow);
						return false;
					}
					ChapterTreeView.upload_dialog.dialog('open');
					handler.url = 'dropboxs/replace?section_id=' + self.data.id;
					callBack();
				},
				onComplete         : function (event, files, index, xhr, handler) {
					// this.dropZone.hide();
					ChapterTreeView.upload_dialog.dialog('close');
					var res = handler.response, name, path, item, img;
					if (checkResponse(res)) {
						set_disksize(res.disksize);
						name = files[index].fileName || files[index].name;
						self.afterSetAttachment(name = name.substr(0, name.lastIndexOf('.')), res.data.attachment_type, path = res.data.attachment_path);
						item = ChapterTreeView.select_item.find('.img_frame');
						self.img = item.children();
						self.img.attr({
							src : (path.indexOf('.') > 0 ? self.getThumbUrl + ChapterTreeView.handbook_id + '/' : self.thumbUrl) + path
						});
						// can't call resize function here, C'z img is not shown
						//ChapterTreeView.resizeImg.call(img[0]);
						item.next().val(name);
						// to synchronize the local cache
						item = self.model.cache[self.data.id];
						item.attachment_path = self.fields.attachment_path.val();
					}
				},
				dropZone           : this.section_drop_area,
				onDragEnter2       : function () {
					this.dropZone.addClass('hover');
				},
				onDragLeave2       : function () {
					this.dropZone.removeClass('hover');
				},
				dropZoneEnlarge    : function () {
					this.dropZone.addClass('hover');
				},
				dropZoneReduce     : function () {
					this.dropZone.removeClass('hover');
				},
				beforeDrop         : function () {
					this.dropZone.addClass('loading');
				},
				onDocumentDragOver : function () {
					if (this.dragOverTimeout) {
						clearTimeout(this.dragOverTimeout);
					}
					var dropZone = this.dropZone;
					this.dragOverTimeout = setTimeout(function () {
						dropZone.stop().removeClass('hover');
					}, 200);
				},
				onAbort            : function (event, files, index, xhr, handler) {
					handler.removeNode(handler.uploadRow);
					self.attachment_upload.stop();
					this.dropZone.find('input').val('');
					delete uploadingFiles[index];
					if ($.isEmptyObject(uploadingFiles)) {
						ChapterTreeView.upload_dialog.dialog('close');
					}
				},
				onError            : function (event, files, index, xhr, handler) {
					handler.removeNode(handler.uploadRow);
					self.attachment_upload.stop();
					this.dropZone.find('input').val('');
					delete uploadingFiles[index];
					if ($.isEmptyObject(uploadingFiles)) {
						ChapterTreeView.upload_dialog.dialog('close');
					}
				}
			});

			this.question_list_btn = $('#test_toggle_btn').click(function () {
				QuizListView.show();
				QuestionModel.completes = {};
				QuestionModel.list({
					section_id : SectionView.data.id
				});
				QuestionnaireListView.checksheetTitle.html(SectionView.data.ques_title || Msgs.ques);
			});
			this.section_question_tags = $('#section_question_tags');
			var $permlink_btn = this.permlink_btn = $('#permlink_btn'), $permlink_txt = this.permlink_txt = $('#permlink_txt'), $closelink_btn = this.closelink_btn = $permlink_btn.find('.right_icon');
			$permlink_btn.click(function () {
				if ($permlink_btn.hasClass('collapse')) {
					var protocol = location.protocol == 'http:' ? 'handbook3://' : 'handbook3s://';
					$permlink_txt.html(protocol + location.host + '/H' + BookModel.cache[BookListView.select_id].xor_value + 'S' + self.data.xor_value);
					$permlink_btn.removeClass('collapse');
					$closelink_btn.show();
				}
			});
			$closelink_btn.click(function (e) {
				$permlink_btn.addClass('collapse');
				$permlink_txt.html('PermLink');
				$closelink_btn.hide();
				e.stopImmediatePropagation();
			});
			return this;
		},
		beforeSave         : function (data) {
			if (data.id) {// edit follow normal way
				return;
			}
			var item = ChapterTreeView.select_item;
			if (item && item.length) {
				if (item.hasClass('chapter') || item.hasClass('chapter_list_item')) {
					ChapterTreeView.chapter_item = item;
					data['chapter_id'] = data['data[chapter_id]'] = item.attr('data-id');
					data['data[section_id]'] = 0;
				} else {
					data['chapter_id'] = data['data[chapter_id]'] = (ChapterTreeView.chapter_item = item.prevAll(preference.section_list_layout ? '.chapter_list_item' : '.chapter:eq(0)')).attr('data-id');
					data['data[section_id]'] = item.attr('data-id');
				}
			} else {
				data['chapter_id'] = data['data[chapter_id]'] = ChapterTreeView.container.children(preference.section_list_layout ? '.chapter_list_item:last' : '.chapter:last').attr('data-id');
				data['data[section_id]'] = ChapterTreeView.container.children(preference.section_list_layout ? '.section_list_item:last' : '.section:last').attr('data-id') || 0;
			}
		},
		onSave             : function (data, fulldata, res) {
			set_disksize(res.disksize);
			if (!res.id) {
				return;
			}
			var item = ChapterTreeView.insertItem(fulldata, ChapterTreeView.select_item, null, 0, ChapterTreeView.chapter_item);
			ChapterTreeView.selectItem(ChapterTreeView.getItem(res.id, 1));
			if (!preference.section_list_layout) {
				if (fulldata.attachment_path == '0') {
					fulldata.attachment_path = fulldata.description || fulldata.description_ipad ? 0 : -1;
				}
				var container = ChapterTreeView.container, img = item.find('img').droppable(ChapterTreeView.dropAttachCfg);
				ChapterTreeView.draggers = container.children().draggable(ChapterTreeView.dragCfg);
				ChapterTreeView.droppers = container.find('.dropper').droppable(ChapterTreeView.dropCfg);
				if (img[0].width) {
					ChapterTreeView.resizeImg.call(img[0]);
				}
				img.load(ChapterTreeView.resizeImg);
			}
			if (ChapterTreeView.container.find('.' + ChapterTreeView.itemClasses[1]).length) {// no sections before save
				ChapterTreeView.new_section.remove();
			}
		},
		beforeChange       : function (data) {
			if (data.id) {
				this.question_list_btn.show();
				this.permlink_btn.show().addClass('collapse');
				this.permlink_txt.html('PermLink');
				this.closelink_btn.hide();
			} else {
				this.question_list_btn.hide();
				this.permlink_btn.hide();
			}
			this.showQuestionTag(data.id, data.quiz_count, data.exam_count, data.ques_count);
		},
		showQuestionTag    : function (id, quizCount, examCount, quesCount) {
			SectionView.section_question_tags.removeClass('quiz exam ques');
			if (id) {
				if (quizCount > 0) {
					SectionView.section_question_tags.addClass('quiz');
				}
				if (examCount > 0) {
					SectionView.section_question_tags.addClass('exam');
				}
				if (quesCount > 0) {
					SectionView.section_question_tags.addClass('ques');
				}
				SectionModel.cache[id].quiz_count = quizCount || 0;
				SectionModel.cache[id].exam_count = examCount || 0;
				SectionModel.cache[id].ques_count = quesCount || 0;
			}
		},
		insertMedia        : function (id, category, name, type) {
			var s = Consts[category].replace(/{id}/g, id).replace(/{name}/g, name).replace(/{name2}/g, encodeURI(name)).replace(/{type}/g, category == 'application' ? type : category), editor = SectionView.selected_editor, body;
			if (editor !== SectionView.editor) {
				s = s.replace(/280x280/, '512x512');
			}
			editor.focus();
			var selectedNode = editor.getSelection().getRanges() && editor.getSelection().getRanges()[0].startContainer.getAscendant('span', true);
			if (editor.focusManager.hasFocus) {
				if (selectedNode) {
					$(selectedNode.$).after(s);
				} else {
					var _el = CKEDITOR.dom.element.createFromHtml(s);
					editor.insertElement(_el);
				}
			} else {
				$(editor.document.$.body).append(s);
			}
		},
		show               : function () {
			if (!this.initialized) {
				this.init();
			}
			if (SectionView.data && SectionView.data.id && SectionView.data.id == QuizListView.section_id) {
				this.showQuestionTag(SectionView.data.id, QuizListView.items.length, ExamListView.items.length, QuestionnaireListView.items.length);
			}
			$info_bar.hide();
			$handbook_info.html(BookModel.cache[BookListView.select_id].name).show();
			prevView = ChapterTreeView;
			document.body.className = 'section_layout';
			$back_btn.attr('title', Msgs.back_to_chapters);
			this.hidePadArea();
			this.insert_editor = null;
			Medialib.insertMedia = null;
			return this;
		},
		hide               : function () {
			ChapterTreeView.show();
			if (ChapterTreeView.select_id && this.img && this.img[0]) {	// this is for the d&d attachment from FS
				ChapterTreeView.resizeImg.call(this.img[0]);
				this.img = null;
			}
			return this;
		},
		showPadArea        : function () {
			this.selected_editor = this.ipad_editor;
			this.iphone_area.hide();
			this.pad_area.show();
			this.iphone_btn.removeClass('selected');
			this.pad_btn.addClass('selected');
		},
		hidePadArea        : function () {
			this.selected_editor = this.editor;
			this.iphone_area.show();
			this.pad_area.hide();
			this.iphone_btn.addClass('selected');
			this.pad_btn.removeClass('selected');
		},
		afterSetAttachment : function (name, type, path) {
			this.section_drop_tips.hide();
			this.attachment_upload.hide();
			this.attachment_clear_btn.show();
			if (type !== 'audio') {
				this.section_mask.show();
				this.iphone_area.droppable('disable');
				this.pad_area.droppable('disable');
			} else {
				this.section_mask.hide();
				this.iphone_area.droppable('enable');
				this.pad_area.droppable('enable');
			}
			this.fields.name.val(name.substr(0, 50));
			this.section_attachment_ico.attr('src', (path.indexOf('.') > 0 ? this.getThumbUrl + ChapterTreeView.handbook_id + '/' : this.thumbUrl) + path);
			this.fields.attachment_path.val(path);
			this.section_attachment_name.html(name);
			this.fields.attachment_name.val(name);
			this.fields.attachment_type.val(type);
		},
		dropHandler        : function (e, ui) {
			var item, name, id, src, type;
			if (ui) {
				item = ui.draggable.parents('.media_item');
				this.afterSetAttachment(item.children('label').html(), item.attr('data-type'), item.attr('data-id'));
			} else {
				name = type = '';
				id = 0;
				src = this.defaultDropImg;
				this.section_drop_tips.show();
				this.attachment_upload.show();
				this.attachment_clear_btn.hide();
				this.section_mask.hide();
				this.iphone_area.droppable('enable');
				this.pad_area.droppable('enable');
				this.fields.name.val(this.data.name);
				// this.data.attahcment_type = null;
				this.section_attachment_ico.attr('src', src);
				this.fields.attachment_path.val(id);
				this.section_attachment_name.html(name);
				this.fields.attachment_name.val(name);
				this.fields.attachment_type.val(type);
			}
		}
	});

	function chapter_same_init() {
		var self = this;
		this.checkResponse = checkResponse;
		ChapterView.init();
		SectionView.init();
		this.clone_btn = $('#cs_dup_btn').click(this.cloneHandler.bind(this));
		this.btns = this.edit_btn.add(this.del_btn).add(this.clone_btn);
		this.afterRemove = function (id, res) {
			if (res.success) {
				set_disksize(res.disksize);
				if (typeof (res.data.chapter_id) !== 'undefined') {
					$.console(Msgs.completed_remove_the_section + res.data.name);
				} else {
					$.console(Msgs.completed_remove_the_chapter + res.data.name);
				}
			}
			if (!this.container.find('.' + ChapterTreeView.itemClasses[1]).length) {
				this.container.append(this.new_section.click(this.addSection));
			}
		};
	}

	var ChapterTreeView = preference.section_list_layout ? new TreeView('chapters', {
		templates          : ['<li class="chapter_list_item item" data-id="{id}" data-depth="0">{name}<span class="chapter_label"></span><span class="chapter_keycode">' + Msgs.keycode + ':{keycode}</span></li>{[Section]}', '<li class="section_list_item item" data-id="{id}" data-depth="1">{name}<span class="{attachment_path}"></span></li>'],
		models             : ['chapter', 'section'],
		container          : '#chapter_list_area',
		itemClasses        : ['chapter_list_item', 'section_list_item'],
		views              : ['chapter', 'section'],
		plurals            : ['Section'],
		del_btn            : '#cs_del_btn',
		edit_btn           : '#cs_edit_btn',
		dblclickEditable   : true,
		gets               : [
			{
				name : function (data) {
					return data.escapeHTML();
				}
			},
			{
				name            : function (data) {
					return data.escapeHTML();
				},
				attachment_path : function (data, fulldata) {
					if (data == '0' || !data) {
						return 'html';
					} else if (data == '-1') {
						return 'empty';
					} else {
						var _sps = data.split('.');
						// for the attachment from medialib
						var _ext = _sps.length === 1 ? fulldata.attachment_type : _sps[_sps.length - 1];
						if ($.inArray(_ext, Consts.allowedImageExtensions) !== -1 || _ext === 'image') {
							return 'image';
						} else if ($.inArray(_ext, Consts.allowedVideoExtensions) !== -1 || _ext === 'video') {
							return 'video';
						} else if ($.inArray(_ext, Consts.allowedApplicationExtensions) !== -1) {
							return 'application';
						} else if ($.inArray(_ext, Consts.allowedAudioExtensions) !== -1 || _ext === 'audio') {
							return 'audio';
						}
					}
				}
			}
		],
		init               : function () {
			TreeView.prototype.init.call(this);
			chapter_same_init.call(this);
			var oldPrevId, self = this;
			this.new_section = $('<li id="new_list_section">' + Msgs.add_a_new_section + '</li>');
			this.container.sortable({
				revert : true,
				start  : function (event, ui) {
					ui.item.css({
						'background' : '#0172F1',
						'opacity'    : '0.5'
					});
					oldPrevId = ui.item.prev().attr('data-id');
				},
				stop   : function (event, ui) {
					var _item = ui.item, moveData = {}, is = _item.hasClass('section_list_item'), _prev = _item.prev();
					window.setTimeout(function () {
						_item.removeAttr('style');
					}, 500);
					if (oldPrevId === _prev.attr('data-id')) {
						return;
					}
					if (is) {
						moveData['data[Section][id]'] = _item.attr('data-id');
					} else {
						moveData['data[Chapter][id]'] = _item.attr('data-id');
					}
					if (_prev.hasClass('chapter_list_item')) {
						moveData['data[seciton_id]'] = 0
					} else {
						moveData['data[section_id]'] = _prev.attr('data-id');
					}
					moveData['data[chapter_id]'] = _item.prevAll('.chapter_list_item:eq(0)').attr('data-id');
					$.ajax({
						url      : ( is ? 'sections' : 'chapters') + '/move/',
						type     : 'POST',
						data     : moveData,
						dataType : 'json',
						error    : this.errorCallback,
						success  : this.checkResponse
					});
				}
			});

			var uploadingFiles = {};
			this.upload_dialog = $('#section_upload_dialog').dialog({
				autoOpen2   : false,
				draggable   : false,
				resizable   : false,
				stack       : false,
				width       : 400,
				dialogClass : 'section_upload_dialog',
				modal       : true
			}).dialog('close');
			this.section_upload = $('#section_list_upload');
			this.section_upload.fileUploadUI({
				dragDropSupport    : isWindowsSafari ? false : true,
				uploadTable        : $('#section_upload_table'),
				buildUploadRow     : function (files, index) {
					return $('<tbody><tr><td colspan="2">' + files[index].name + '<\/td></tr><tr>' + '<td class="file_upload_progress"><div><\/div><\/td><td class="file_upload_cancel">' + '<button class="ui-state-default ui-corner-all">' + '<span class="ui-icon ui-icon-cancel"><\/span><\/button><\/td><\/tr></tbody>');
				},
				beforeSend         : function (event, files, index, xhr, handler, callBack) {
					uploadingFiles[index] = true;
					fn = files[index].fileName || files[index].name;
					ext = fn.split('.').pop().toLowerCase();
					if (ext.length > 1 && $.inArray(ext, Consts.allowedExtensions) < 0) {
						delete uploadingFiles[index];
						$.console(Errors.invalid_extension.replace('{filename}', fn).replace('{extensions}', Consts.allowedExtensions.join(',')), 3);
						this.dropZone.find('input').val('');
						self.section_upload.stop().hide();
						handler.removeNode(handler.uploadRow);
						return false;
					}
					ChapterTreeView.upload_dialog.dialog('open');
					handler.url = 'dropboxs/upload?handbook_id=' + self.handbook_id;
					callBack();
				},
				onComplete         : function (event, files, index, xhr, handler) {
					delete uploadingFiles[index];
					if ($.isEmptyObject(uploadingFiles)) {
						this.dropZone.stop().hide();
						ChapterTreeView.upload_dialog.dialog('close');
						if (self.checkResponse(handler.response)) {
							set_disksize(handler.response.disksize);
							ChapterModel.listCache = {};
							ChapterTreeView.load({
								'handbook_id' : self.handbook_id,
								is            : 1
							});
						}
					}
				},
				dropZoneEnlarge    : function () {
					this.dropZone.show();
				},
				beforeDrop         : function () {
					this.dropZone.addClass('loading');
				},
				onDocumentDragOver : function () {
					if (this.dragOverTimeout) {
						clearTimeout(this.dragOverTimeout);
					}
					var dropZone = this.dropZone;
					this.dragOverTimeout = setTimeout(function () {
						dropZone.stop().hide();
					}, 200);
				},
				onAbort            : function (event, files, index, xhr, handler) {
					handler.removeNode(handler.uploadRow);
					self.section_upload.stop().hide();
					this.dropZone.find('input').val('');
					delete uploadingFiles[index];
					if ($.isEmptyObject(uploadingFiles)) {
						ChapterTreeView.upload_dialog.dialog('close');
					}
				},
				onError            : function (event, files, index, xhr, handler) {
					handler.removeNode(handler.uploadRow);
					self.section_upload.stop().hide();
					this.dropZone.find('input').val('');
					delete uploadingFiles[index];
					if ($.isEmptyObject(uploadingFiles)) {
						ChapterTreeView.upload_dialog.dialog('close');
					}
				}
			});
			return this;
		},
		show               : function (bid) {
			if (!this.initialized) {
				this.init();
			}
			prevView = BookListView;
			document.body.className = 'chapters_layout list';
			$back_btn.attr('title', Msgs.back_to_books);
			$info_bar.show();
			$handbook_info.hide();
			Medialib.insertMedia = this.insertMedia;
			return this;
		},
		cloneHandler       : function () {
			if (this.clone_btn.hasClass('disable') || !this.select_id) {
				return;
			}
			var item = this.select_item, is = item.hasClass('section_list_item'), cloneItem = item.clone().addClass('disable').attr('data-id', ''), data = {};
			item.after(cloneItem);

			if (is) {
				data['data[Section][id]'] = this.select_id;
			} else {
				data['data[Chapter][id]'] = this.select_id;
			}
			if (cloneItem.html().slice(0, 8) !== 'Copy of ') {
				cloneItem.html('Copy of ' + cloneItem.html());
			}
			$.ajax({
				url      : ( is ? 'sections' : 'chapters') + '/clone/',
				type     : 'POST',
				data     : data,
				dataType : 'json',
				timeout  : this.timeout,
				context  : this,
				error    : this.errorCallback,
				success  : function (res, status, xhr) {
					if (this.checkResponse(res)) {
						var model = this.models[ is ? 1 : 0], olddata = model.cache[this.select_id], data = {}, container = this.container, p;
						for (p in olddata) {
							data[p] = olddata[p];
						}
						data.id = res.id;
						set_disksize(res.disksize);
						if (model.localAdapter.save.call(model, data, this.pseudoFn)) {
							model.completes[res.id] = false;
							cloneItem.attr('data-id', res.id).removeClass('disable selected');
						}
						;
					}
				}
			});
		},
		onChange           : function () {
			var container = this.container.removeClass('disable'), items = container.children();
			items.eq(0).hide();
			if (!container.find('.section_list_item').length) {
				container.append(this.new_section.click(this.addSection));
			}
		},
		addSection         : function () {
			SectionView.show().change({});
		},
		onSelectItemChange : function (item, select) {
			this.btns[select ? 'removeClass' : 'addClass']('disable');
			Dealkeybind();
		},
		check              : function () {
			return false;
		}
	}) : new TreeView('chapters', {
		templates          : ['<div class="chapter item" data-id="{id}" data-depth="0"><div class="dropper"><div></div></div><div class="chapter_frame"><div class="text_overflow" title="{name}">{name}</div></div><div class="dropper"><div></div></div></div>{[Section]}', '<div class="section item" data-id="{id}" data-depth="1" title="{name}"><div class="dropper"><div></div></div><div><div class="img_frame"><img src="{attachment_path}"></div><input class="readonly" readonly value="{name}"></div><div class="dropper"><div></div></div></div>'],
		models             : ['chapter', 'section'],
		container          : '#chapter_grid_area',
		itemClasses        : ['chapter', 'section'],
		views              : ['chapter', 'section'],
		plurals            : ['Section'],
		del_btn            : '#cs_del_btn',
		edit_btn           : '#cs_edit_btn',
		dblclickEditable   : true,
		container          : '#chapter_graphic_area',
		gets               : [
			{
				name : function (data) {
					return data.escapeHTML();
				}
			},
			{
				name            : function (data) {
					return data.escapeHTML();
				},
				attachment_path : function (path) {
					return path == '0' || !path ? this.defaultHtmlImg : path == '-1' ? this.defaultSectionImg : path.indexOf('.') > 0 ? this.getThumbUrl + this.handbook_id + '/' + path : this.thumbUrl + path;
				}
			}
		],
		init               : function () {
			TreeView.prototype.init.call(this);
			chapter_same_init.call(this);
			this.getThumbUrl = Consts.getThumbUrl;
			this.thumbUrl = Consts.thumbUrl;
			this.defaultSectionImg = Consts.defaultSectionImg;
			this.defaultHtmlImg = Consts.defaultHtmlImg;
			this.errorCallback = errorCallback;

			this.new_section = $('<div id="new_section"></div>');
			this.dropAttachCfg = {
				addClasses : false,
				greedy     : true,
				accept     : 'img',
				tolerance  : 'pointer',
				drop       : this.dropHandler.bind(this)
			}
			var self = this, uploadingFiles = {};
			this.dragCfg = {
				addClasses        : false,
				scope             : 'cs',
				opacity           : 0.5,
				revert            : true,
				refreshPositions2 : true,
				start             : function (e, ui) {
					self.prevItem = ui.helper.prev();
				}
			};
			this.dropCfg = {
				addClasses : false,
				scope      : 'cs',
				greedy     : true,
				tolerance  : 'pointer',
				hoverClass : 'hover',
				drop       : this.moveHandler.bind(this)
			};

			this.section_upload = $('#section_upload');

			this.upload_dialog = $('#section_upload_dialog').dialog({
				autoOpen2   : false,
				draggable   : false,
				resizable   : false,
				stack       : false,
				width       : 400,
				dialogClass : 'section_upload_dialog',
				modal       : true
			}).dialog('close');
			this.uploadCfg = {
				dragDropSupport    : isWindowsSafari ? false : true,
				uploadTable        : $('#section_upload_table'),
				buildUploadRow     : function (files, index) {
					return $('<tbody><tr><td colspan="2"><div class="file_upload_name">' + files[index].name + '<\/div><\/td></tr><tr>' + '<td class="file_upload_progress"><div><\/div><\/td><td class="file_upload_cancel">' + '<button class="ui-state-default ui-corner-all">' + '<span class="ui-icon ui-icon-cancel"><\/span><\/button><\/td><\/tr></tbody>');
				},
				beforeSend         : function (event, files, index, xhr, handler, callBack) {
					uploadingFiles[index] = true;
					fn = files[index].fileName || files[index].name;
					ext = fn.split('.').pop().toLowerCase();
					if (ext.length > 1 && $.inArray(ext, Consts.allowedExtensions) < 0) {
						delete uploadingFiles[index];
						$.console(Errors.invalid_extension.replace('{filename}', fn).replace('{extensions}', Consts.allowedExtensions.join(',')), 3);
						this.dropZone.find('input').val('');
						self.section_upload.stop().hide();
						handler.removeNode(handler.uploadRow);
						return false;
					}
					ChapterTreeView.upload_dialog.dialog('open');
					handler.url = 'dropboxs/upload?handbook_id=' + self.handbook_id;
					callBack();
				},
				onComplete         : function (event, files, index, xhr, handler) {
					delete uploadingFiles[index];
					if ($.isEmptyObject(uploadingFiles)) {
						this.dropZone.removeClass('loading');
						ChapterTreeView.upload_dialog.dialog('close');
						if (self.checkResponse(handler.response)) {
							set_disksize(handler.response.disksize);
							ChapterModel.listCache = {};
							ChapterTreeView.load({
								'handbook_id' : self.handbook_id,
								is            : 1
							});
						}
					}
				},
				dropZoneEnlarge    : function () {
					this.dropZone.removeClass('file_upload_large').show();
				},
				beforeDrop         : function () {
					this.dropZone.addClass('loading');
				},
				onDocumentDragOver : function () {
					if (this.dragOverTimeout) {
						clearTimeout(this.dragOverTimeout);
					}
					var dropZone = this.dropZone;
					this.dragOverTimeout = setTimeout(function () {
						dropZone.stop().hide();
					}, 200);
				},
				onAbort            : function (event, files, index, xhr, handler) {
					handler.removeNode(handler.uploadRow);
					self.section_upload.stop().hide();
					this.dropZone.find('input').val('');
					delete uploadingFiles[index];
					if ($.isEmptyObject(uploadingFiles)) {
						ChapterTreeView.upload_dialog.dialog('close');
					}
				},
				onError            : function (event, files, index, xhr, handler) {
					handler.removeNode(handler.uploadRow);
					self.section_upload.stop().hide();
					this.dropZone.find('input').val('');
					delete uploadingFiles[index];
					if ($.isEmptyObject(uploadingFiles)) {
						ChapterTreeView.upload_dialog.dialog('close');
					}
				}
			};
			return this;
		},
		resizeImg          : BookListView.resizeImg,
		loadImg            : BookListView.loadImg,
		addSection         : function () {
			SectionView.show().change({});
		},
		show               : function (bid) {
			if (!this.initialized) {
				this.init();
			}
			prevView = BookListView;
			document.body.className = 'chapters_layout graphic';
			$back_btn.attr('title', Msgs.back_to_books);
			$info_bar.show();
			$handbook_info.hide();
			Medialib.insertMedia = this.insertMedia;
			return this;
		},
		onChange           : function () {
			var container = this.container.removeClass('disable'), items = container.children();
			items.eq(0).css({
				position : 'absolute',
				left     : '-1000px'
			});
			container.find('.img_frame>img').each(this.loadImg).droppable(this.dropAttachCfg);
			if (!container.find('.section').length) {
				container.append(this.new_section.click(this.addSection));
			}
			this.draggers = items.draggable(this.dragCfg);
			this.droppers = container.find('.dropper').droppable(this.dropCfg);
			this.section_upload.find('input').val('');
			container.append(this.section_upload.hide());
			this.section_upload.fileUploadUI(this.uploadCfg);
		},
		onSelectItemChange : function (item, select) {
			this.btns[select ? 'removeClass' : 'addClass']('disable');
			Medialib.insertMedia = select && item.hasClass('section') ? this.insertMedia : null;
			Dealkeybind();
		},
		insertMedia        : function (id, category, name, type) {
			var item = ChapterTreeView.select_item, img = item.find('img');
			if (!item.hasClass('section')) {
				return;
			}
			img.attr({
				src : Consts.thumbUrl + id
			});
			item.find('input').val(name);
			BookView.resizeImg.call(img[0]);
			// $this.next().hide();
			SectionModel.update({
				id              : ChapterTreeView.select_id,
				name            : name,
				attachment_name : name,
				attachment_type : type,
				attachment_path : id
			}, true, this.pseudoFn);
		},
		changeItem         : function (data, fulldata, item, res, depth) {
			if (depth == 1) {
				if (fulldata.attachment_path == '0' || data.attachment_path) {
					item.find('img').attr('src', this.gets[1].attachment_path.call(this, data.attachment_path > 0 ? data.attachment_path : (fulldata.description || fulldata.description_ipad ? 0 : -1)));
				}
				if (data.name) {
					item.attr('title', data.name);
					item.find('input').val(data.name);
				}
			} else {
				if (data.name) {
					item.find('.text_overflow').attr('title', data.name).html(data.name);
				}
			}
			return item;
			// return item.html($(this.getHtml(fulldata, depth)).html());
		},
		check              : function () {
			return false;
		},
		cloneHandler       : function () {
			if (this.clone_btn.hasClass('disable') || !this.select_id) {
				return;
			}
			var item = this.select_item, is = item.hasClass('section'), cloneItem = item.clone().addClass('disable').attr('data-id', ''), data = {};
			item.after(cloneItem);
			if (is) {
				this.resizeImg.call(cloneItem.find('img')[0]);
				data['data[Section][id]'] = this.select_id;
				var $_cloneInput = cloneItem.find('input');
				if ($_cloneInput.val().slice(0, 8) !== 'Copy of ') {
					$_cloneInput.val('Copy of ' + $_cloneInput.val());
				}
			} else {
				data['data[Chapter][id]'] = this.select_id;
				var $_cloneDiv = cloneItem.find('.text_overflow');
				if ($_cloneDiv.html().slice(0, 8) !== 'Copy of ') {
					$_cloneDiv.html('Copy of ' + $_cloneDiv.html()).attr('title', 'Copy of ' + $_cloneDiv.html());
				}
			}
			$.ajax({
				url      : ( is ? 'sections' : 'chapters') + '/clone/',
				type     : 'POST',
				data     : data,
				dataType : 'json',
				timeout  : this.timeout,
				context  : this,
				error    : this.errorCallback,
				success  : function (res, status, xhr) {
					if (this.checkResponse(res)) {
						var model = this.models[ is ? 1 : 0], olddata = model.cache[this.select_id], data = {}, container = this.container, p;
						for (p in olddata) {
							data[p] = olddata[p];
						}
						data.id = res.id;
						set_disksize(res.disksize);
						if (model.localAdapter.save.call(model, data, this.pseudoFn)) {
							container.find('.img_frame>img').each(this.loadImg).droppable(this.dropAttachCfg);
							model.completes[res.id] = false;
							cloneItem.attr('data-id', res.id).removeClass('disable selected');
							this.draggers = container.children().draggable(this.dragCfg);
							this.droppers = container.find('.dropper').droppable(this.dropCfg);
						}
						;
					}
				}
			});
		},
		moveHandler        : function (e, ui) {
			var item = ui.draggable, is = item.hasClass('section'), t = e.target, refItem = $(t).parent(), data = {};
			if (refItem.children(':first')[0] === t) {
				refItem = refItem.prev();
			}
			if (refItem[0] === item[0] || refItem[0] === this.prevItem[0]) {// position not change
				return;
			}
			refItem.after(item);
			item.css({
				top  : 0,
				left : 0
			});
			this.droppers.removeClass('hover');
			data['data[' + ( is ? 'Section' : 'Chapter') + '][id]'] = item.attr('data-id');
			if (refItem.hasClass('chapter')) {
				ChapterTreeView.chapter_item = refItem;
				data['data[chapter_id]'] = refItem.attr('data-id');
				data['data[section_id]'] = 0;
			} else {
				data['data[chapter_id]'] = (ChapterTreeView.chapter_item = refItem.prevAll('.chapter:eq(0)')).attr('data-id');
				data['data[section_id]'] = refItem.attr('data-id');
			}
			$.ajax({
				url      : ( is ? 'sections' : 'chapters') + '/move/',
				type     : 'POST',
				data     : data,
				dataType : 'json',
				timeout  : this.timeout,
				error    : this.errorCallback,
				success  : this.checkResponse
			});
		},
		dropHandler        : function (e, ui) {
			var target = e.target, src, name, item;
			if (target.tagName !== 'IMG') {
				return;
			}
			target = $(target);
			src = ui.draggable.attr('src');
			if (target.attr('src') == src) {// same attachment
				return;
			}
			target.attr({
				src : src
			});
			this.resizeImg.call(target[0]);
			src = src.split('/');
			item = ui.draggable.parents('.media_item');
			target.parent().next().val(name = item.children('label').html());
			// $this.next().hide();
			SectionModel.update({
				id              : target.parents('.section:eq(0)').attr('data-id'),
				name            : name,
				attachment_name : name,
				attachment_type : item.attr('data-type'),
				attachment_path : src[src.length - 1]
			}, true, this.pseudoFn);
		}
	});
	var prevView, $back_btn = $('#head_back_btn').click(function () {
		prevView.show();
	});
} catch (e) {}