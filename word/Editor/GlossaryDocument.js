/*
 * (c) Copyright Ascensio System SIA 2010-2019
 *
 * This program is a free software product. You can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License (AGPL)
 * version 3 as published by the Free Software Foundation. In accordance with
 * Section 7(a) of the GNU AGPL its Section 15 shall be amended to the effect
 * that Ascensio System SIA expressly excludes the warranty of non-infringement
 * of any third-party rights.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR  PURPOSE. For
 * details, see the GNU AGPL at: http://www.gnu.org/licenses/agpl-3.0.html
 *
 * You can contact Ascensio System SIA at 20A-12 Ernesta Birznieka-Upisha
 * street, Riga, Latvia, EU, LV-1050.
 *
 * The  interactive user interfaces in modified source and object code versions
 * of the Program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU AGPL version 3.
 *
 * Pursuant to Section 7(b) of the License you must retain the original Product
 * logo when distributing the program. Pursuant to Section 7(e) we decline to
 * grant you any rights under trademark law for use of our trademarks.
 *
 * All the Product's GUI elements, including illustrations and icon sets, as
 * well as technical writing content are licensed under the terms of the
 * Creative Commons Attribution-ShareAlike 4.0 International. See the License
 * terms at http://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 */

"use strict";
/**
 * User: Ilja.Kirillov
 * Date: 25.03.2020
 * Time: 16:06
 */

/**
 * Класс для хранения и работы с дополнительными DocContents
 * @param {CDocument} oLogicDocument
 * @constructor
 */
function CGlossaryDocument(oLogicDocument)
{
	this.LogicDocument = oLogicDocument;
}
/**
 * @returns {CDocument}
 */
CGlossaryDocument.prototype.GetLogicDocument = function()
{
	return this.LogicDocument;
};
/**
 * Класс, представляющий дополнительное содержимое документа (например, для плейсхолдеров документа)
 * @param {CGlossaryDocument} oGlossary
 * @constructor
 * @extends {CDocumentContent}
 */
function CDocPart(oGlossary)
{
	var oLogicDocument = oGlossary ? oGlossary.GetLogicDocument() : null;

	CDocumentContent.call(this, oLogicDocument, oLogicDocument ? oLogicDocument.GetDrawingDocument() : undefined, 0, 0, 0, 0, true, false, false);

	this.Glossary = oGlossary;
	this.Pr       = new CDocPartPr()
}

CDocPart.prototype = Object.create(CDocumentContent.prototype);
CDocPart.prototype.constructor = CDocPart;

/** @enum {number} */
var c_oAscDocPartType = {
	Undefined   : 0x0000,
	All         : 0x0001,
	AutoExp     : 0x0002,
	BBPlcHolder : 0x0004,
	FormFld     : 0x0008,
	None        : 0x0010,
	Normal      : 0x0020,
	Speller     : 0x0040,
	Toolbar     : 0x0080
};

/** @enum {number} */
var c_oAscDocPartBehavior = {
	Undefined : 0x00,
	Content   : 0x01,
	P         : 0x02,
	Pg        : 0x04
};

/**
 * Настройки для дополнительного содержимого документа
 * @constructor
 */
function CDocPartPr()
{
	this.Name        = undefined;
	this.Style       = undefined;
	this.Types       = c_oAscDocPartType.Undefined;
	this.Description = undefined;
	this.GUID        = undefined;
	this.Category    = undefined;
	this.Behavior    = c_oAscDocPartBehavior.Undefined;
}

/** @enum {number} */
var c_oAscDocPartGallery = {
	Any               : 0,
	AutoTxt           : 1,
	Bib               : 2,
	CoverPg           : 3,
	CustAutoTxt       : 4,
	CustBib           : 5,
	CustCoverPg       : 6,
	CustEq            : 7,
	CustFtrs          : 8,
	CustHdrs          : 9,
	Custom1           : 10,
	Custom2           : 11,
	Custom3           : 12,
	Custom4           : 13,
	Custom5           : 14,
	CustPgNum         : 15,
	CustPgNumB        : 16,
	CustPgNumMargins  : 17,
	CustPgNumT        : 18,
	CustQuickParts    : 19,
	CustTblOfContents : 20,
	CustTbls          : 21,
	CustTxtBox        : 22,
	CustWatermarks    : 23,
	Default           : 24,
	DocParts          : 25,
	Eq                : 26,
	Ftrs              : 27,
	Hdrs              : 28,
	PgNum             : 29,
	PgNumB            : 30,
	PgNumMargins      : 31,
	PgNumT            : 32,
	Placeholder       : 33,
	TblOfContents     : 34,
	Tbls              : 35,
	TxtBox            : 36,
	Watermarks        : 37
};

/**
 * Класс для определения категории заданного специального содержимого
 * @constructor
 */
function CDocPartCategory()
{
	this.Name    = "";
	this.Gallery = c_oAscDocPartGallery.Default;
}

//------------------------------------------------------------export---------------------------------------------------
var prot;
window["Asc"] = window["Asc"] || {};

prot = window["Asc"]["c_oAscDocPartType"] = c_oAscDocPartType;

prot["Undefined"]   = c_oAscDocPartType.Undefined;
prot["All"]         = c_oAscDocPartType.All;
prot["AutoExp"]     = c_oAscDocPartType.AutoExp;
prot["BBPlcHolder"] = c_oAscDocPartType.BBPlcHolder;
prot["FormFld"]     = c_oAscDocPartType.FormFld;
prot["None"]        = c_oAscDocPartType.None;
prot["Normal"]      = c_oAscDocPartType.Normal;
prot["Speller"]     = c_oAscDocPartType.Speller;
prot["Toolbar"]     = c_oAscDocPartType.Toolbar;


prot = window["Asc"]["c_oAscDocPartGallery"] = c_oAscDocPartGallery;

prot["Undefined"] = c_oAscDocPartType.Undefined;

prot["Any"]               = c_oAscDocPartGallery.Any;
prot["AutoTxt"]           = c_oAscDocPartGallery.AutoTxt;
prot["Bib"]               = c_oAscDocPartGallery.Bib;
prot["CoverPg"]           = c_oAscDocPartGallery.CoverPg;
prot["CustAutoTxt"]       = c_oAscDocPartGallery.CustAutoTxt;
prot["CustBib"]           = c_oAscDocPartGallery.CustBib;
prot["CustCoverPg"]       = c_oAscDocPartGallery.CustCoverPg;
prot["CustEq"]            = c_oAscDocPartGallery.CustEq;
prot["CustFtrs"]          = c_oAscDocPartGallery.CustFtrs;
prot["CustHdrs"]          = c_oAscDocPartGallery.CustHdrs;
prot["Custom1"]           = c_oAscDocPartGallery.Custom1;
prot["Custom2"]           = c_oAscDocPartGallery.Custom2;
prot["Custom3"]           = c_oAscDocPartGallery.Custom3;
prot["Custom4"]           = c_oAscDocPartGallery.Custom4;
prot["Custom5"]           = c_oAscDocPartGallery.Custom5;
prot["CustPgNum"]         = c_oAscDocPartGallery.CustPgNum;
prot["CustPgNumB"]        = c_oAscDocPartGallery.CustPgNumB;
prot["CustPgNumMargins"]  = c_oAscDocPartGallery.CustPgNumMargins;
prot["CustPgNumT"]        = c_oAscDocPartGallery.CustPgNumT;
prot["CustQuickParts"]    = c_oAscDocPartGallery.CustQuickParts;
prot["CustTblOfContents"] = c_oAscDocPartGallery.CustTblOfContents;
prot["CustTbls"]          = c_oAscDocPartGallery.CustTbls;
prot["CustTxtBox"]        = c_oAscDocPartGallery.CustTxtBox;
prot["CustWatermarks"]    = c_oAscDocPartGallery.CustWatermarks;
prot["Default"]           = c_oAscDocPartGallery.Default;
prot["DocParts"]          = c_oAscDocPartGallery.DocParts;
prot["Eq"]                = c_oAscDocPartGallery.Eq;
prot["Ftrs"]              = c_oAscDocPartGallery.Ftrs;
prot["Hdrs"]              = c_oAscDocPartGallery.Hdrs;
prot["PgNum"]             = c_oAscDocPartGallery.PgNum;
prot["PgNumB"]            = c_oAscDocPartGallery.PgNumB;
prot["PgNumMargins"]      = c_oAscDocPartGallery.PgNumMargins;
prot["PgNumT"]            = c_oAscDocPartGallery.PgNumT;
prot["Placeholder"]       = c_oAscDocPartGallery.Placeholder;
prot["TblOfContents"]     = c_oAscDocPartGallery.TblOfContents;
prot["Tbls"]              = c_oAscDocPartGallery.Tbls;
prot["TxtBox"]            = c_oAscDocPartGallery.TxtBox;
prot["Watermarks"]        = c_oAscDocPartGallery.Watermarks;
