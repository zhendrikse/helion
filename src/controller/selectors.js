import {
    CurvednessField,
    GaussianCurvatureField, HeightScalarField, MeanCurvatureField, PrincipalCurvatureField, ShapeIndexField
} from "../model/math/fields.js";
import {
    GradientColorMapper, InfernoColorMapper, JetColorMapper, RdYlBuColorMapper,
    SeismicColorMapper, UniformColorMapper, ViridisColorMapper, WaterAlternativeColorMapper,
    WaterColorMapper
} from "../view/colormappers.js";


export const scalarFields = Object.freeze({
    "height": new HeightScalarField(),
    "mean curvature": new MeanCurvatureField(),
    "principal curvature 1": new PrincipalCurvatureField(1),
    "principal curvature 2": new PrincipalCurvatureField(2),
    "gaussian curvature": new GaussianCurvatureField(),
    "shape index": new ShapeIndexField(),
    "curvedness": new CurvednessField()
});

export const colorMappers = Object.freeze({
    "RdYlBu": new RdYlBuColorMapper(),
    "seismic": new SeismicColorMapper(),
    "viridis": new ViridisColorMapper(),
    "jet": new JetColorMapper(),
    "inferno": new InfernoColorMapper(),
    "water": new WaterColorMapper(),
    "water alternative": new WaterAlternativeColorMapper(),
    "gradient": new GradientColorMapper(),
    "uniform": new UniformColorMapper()
});
