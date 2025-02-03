import { ClassAttribute } from "../other/ClassAttribute";
import { ClassMethod } from "../other/ClassMethod";
import { Context } from "../symbol/Context";
import { matchClassSeries, matchDataTypes } from "../../typechecking/TypeChecking";
import { ClassType } from "../types/ClassType";
import { InterfaceMethod } from "../other/InterfaceMethod";
import { Expression } from "../expressions/Expression";


export function checkEncapsulation(ctx: Context, classType: ClassType, element: ClassAttribute | InterfaceMethod, expr: Expression): void {
    let isMethod = element instanceof ClassMethod;

    // get the active class
    let activeClass = ctx.getActiveClass();

    if(!activeClass){
        ctx.parser.customError(`Cannot call local method ${element.name} on instance outside of its class`, expr.location);
    }

    // are we in a static method?
    let currentMethod = ctx.getActiveMethod();
    if(currentMethod && currentMethod.isStatic){
        if(!matchClassSeries(ctx, classType, activeClass)){
            ctx.parser.customError(`Cannot call local ${isMethod?"method":"attribute"} ${element.name} on instance outside of its class`, expr.location);
        }
    }
    else {
        let res = matchDataTypes(ctx, classType, activeClass);
        if(!res.success){
            ctx.parser.customError(`Cannot call local ${isMethod?"method":"attribute"} ${element.name} on instance outside of its class`, expr.location);
        }
    }

}